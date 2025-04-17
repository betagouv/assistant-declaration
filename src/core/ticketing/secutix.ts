import { eachOfLimit } from 'async';
import { addDays, addSeconds, addYears, isAfter, isBefore, set } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { foreignTaxRateOnPriceError } from '@ad/src/models/entities/errors';
import {
  LiteEventSalesSchema,
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchema,
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import {
  JsonAuthResponseSchema,
  JsonGetCatalogDetailedResponseSchema,
  JsonGetPosConfigResponseSchema,
  JsonGetUpdatedAvailabilitiesResponseSchema,
  JsonIsCatalogServiceAliveResponseSchema,
  JsonListTicketsByCriteriaResponseSchema,
  JsonListVatCodesResponseSchema,
} from '@ad/src/models/entities/secutix';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class SecutixTicketingSystemClient implements TicketingSystemClient {
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;
  protected readonly defaultHeaders = new Headers({
    'Content-Type': 'application/json',
  });

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  protected formatUrl(subpathname: string): string {
    const pathnamePrefix = subpathname === '/v1/auth' ? 'tnai' : 'tnseb';
    const baseUrl = `https://mosa.demo-ws.secutix.com/${pathnamePrefix}/backend-apis`;

    const url = new URL(`${baseUrl}${subpathname}`);

    return url.toString();
  }

  public formatHeadersWithAuthToken(inputHeaders: Headers, accessToken: string): Headers {
    const headers = new Headers(inputHeaders);
    headers.set('Authorization', `Bearer ${accessToken}`);

    return headers;
  }

  public async login(): Promise<string> {
    // Since we have a few operations and the token lives for a short time, we don't manage exactly the token lifecycle
    // and just regenerate a new one for each method process
    const authResponse = await fetch(this.formatUrl(`/v1/auth`), {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        operator: this.accessKey,
        partner: 'assistant-declaration',
        secret: this.secretKey,
      }),
    });

    if (!authResponse.ok) {
      const error = await authResponse.json();

      throw error;
    }

    const authDataJson = await authResponse.json();
    const authData = JsonAuthResponseSchema.parse(authDataJson);

    return authData.token;
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection
      const accessToken = await this.login();

      const healthcheckResponse = await fetch(this.formatUrl(`/catalogService/v1_33/isCatalogServiceAlive`), {
        method: 'POST',
        headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
        body: JSON.stringify({}),
      });

      if (!healthcheckResponse.ok) {
        const error = await healthcheckResponse.json();

        throw error;
      }

      const healthcheckDataJson = await healthcheckResponse.json();
      const healthcheckData = JsonIsCatalogServiceAliveResponseSchema.parse(healthcheckDataJson);

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const accessToken = await this.login();

    // Secutix is returning is huge amount of data for example when fetching performances (like 10 MB response)
    // We wanted to optimize by checking `getLastSetupUpdate` and `getUpdatedAvailabilities` but it requires from us
    // to list inside the `getUpdatedAvailabilities` parameters all `products` IDs... we can be known only by having fetched the huge response...
    // so giving up and getting the whole performances each time since no other choice
    const pointOfSaleResponse = await fetch(this.formatUrl(`/catalogService/v1_33/getPOSConfig`), {
      method: 'POST',
      headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
      body: JSON.stringify({}),
    });

    if (!pointOfSaleResponse.ok) {
      const error = await pointOfSaleResponse.json();

      throw error;
    }

    const pointOfSaleDataJson = await pointOfSaleResponse.json();
    const pointOfSaleData = JsonGetPosConfigResponseSchema.parse(pointOfSaleDataJson);

    const pointOfSaleId = pointOfSaleData.posConfigData.posId;

    // Fetch possible tax rates
    const vatCodesResponse = await fetch(this.formatUrl(`/setupService/v1_33/listVatCodes`), {
      method: 'POST',
      headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
      body: JSON.stringify({}),
    });

    if (!vatCodesResponse.ok) {
      const error = await vatCodesResponse.json();

      throw error;
    }

    const vatCodesDataJson = await vatCodesResponse.json();
    const vatCodesData = JsonListVatCodesResponseSchema.parse(vatCodesDataJson);

    // This call to `getCatalogDetailed` is not perfect since it fetches all the events, and despite it takes ~20 seconds
    // it's still less time than using the endpoint `setupService/v1_33/searchProductsByCriteria` that is taking ~1 minute just for 1 event
    // and also after testing ~3 minutes for 3 events...
    // Note: in case we would we switch over it, make sure to specify filters `granularity` and `searchProductsCriteria.productFamilyTypes`
    const catalogResponse = await fetch(this.formatUrl(`/catalogService/v1_33/getCatalogDetailed`), {
      method: 'POST',
      headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
      body: JSON.stringify({
        scope: 'EXTENDED', // To also get events no longer "on sale"
      }),
    });

    if (!catalogResponse.ok) {
      const error = await catalogResponse.json();

      throw error;
    }

    const catalogDataJson = await catalogResponse.json();

    if (catalogDataJson.statusCode !== 'success') {
      console.warn(JSON.stringify(catalogDataJson));
    }

    const catalogData = JsonGetCatalogDetailedResponseSchema.parse(catalogDataJson);

    const existingProducts = new Map<number, (typeof catalogData)['catalogData']['seasons'][0]['products'][0]>();
    const existingAudienceSubcategories = new Map<
      number,
      (typeof catalogData)['catalogData']['seasons'][0]['audienceCategories'][0]['audienceSubCategories'][0]
    >();

    for (const season of catalogData.catalogData.seasons) {
      for (const product of season.products) {
        // We only want to retrieve live performance entities (no gift, season ticket, pass...)
        // Note: in case `productFamilyType === PACKAGE` it may put some product being `SINGLE_ENTRY` into the property `packageLine`
        // but we consider each live performance is also defined without a package (they should are packed if existing aside this)
        if (product.productFamilyType !== 'SINGLE_ENTRY') {
          continue;
        }

        // No need of looking for event serie that have been cancelled
        if (product.state === 'CANCELED' || product.state === 'CANCELED_CLOSED') {
          continue;
        }

        existingProducts.set(product.id, product);
      }

      for (const audienceCategory of season.audienceCategories) {
        for (const audienceSubcategory of audienceCategory.audienceSubCategories) {
          existingAudienceSubcategories.set(audienceSubcategory.id, audienceSubcategory);
        }
      }
    }

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    if (existingProducts.size > 0) {
      // Amont existing products (event serie), look which one had tickets modified since then to only focus on them
      const recentlyPurchasedProductsResponse = await fetch(this.formatUrl(`/availabilityService/v1_33/getUpdatedAvailabilities`), {
        method: 'POST',
        headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
        body: JSON.stringify({
          pointOfSalesId: pointOfSaleId,
          productIds: Array.from(existingProducts.values()).map((product) => product.id),
          referenceDate: fromDate.toISOString(),
        }),
      });

      if (!recentlyPurchasedProductsResponse.ok) {
        const error = await recentlyPurchasedProductsResponse.json();

        throw error;
      }

      const recentlyPurchasedProductsDataJson = await recentlyPurchasedProductsResponse.json();
      const recentlyPurchasedProductsData = JsonGetUpdatedAvailabilitiesResponseSchema.parse(recentlyPurchasedProductsDataJson);

      const productsIdsToSynchronize = [
        ...new Set<number>(
          // Since there is no API `beforeDate` we simulate it to be consistent across tests (despite getting more data over time)
          // Note: when using their test environment they regularly update all entities so we cannot rely on the `lastUpdate` property
          (toDate && !recentlyPurchasedProductsResponse.url.startsWith('https://mosa.demo-ws.secutix.com/')
            ? recentlyPurchasedProductsData.availabilityUpdateData.filter((aUPair) => isBefore(aUPair.lastUpdate, toDate))
            : recentlyPurchasedProductsData.availabilityUpdateData
          ).map((aUPair) => aUPair.productId)
        ),
      ];

      // Note: for now we do not parallelize to not flood the ticketing system
      await eachOfLimit(productsIdsToSynchronize, 1, async (productId) => {
        const product = existingProducts.get(productId);

        assert(product);
        assert(product.event && product.vatCodeId !== undefined); // Since we filtered `productFamilyType === SINGLE_ENTRY` those properties are provided

        const vatCode = vatCodesData.vatCodes.find((code) => {
          return code.id === product.vatCodeId;
        });

        assert(vatCode);

        if (vatCode.country !== 'FR') {
          throw foreignTaxRateOnPriceError;
        }

        const taxRate = vatCode.currentRate / 100000; // Receiving 2100 mening 2.1%, so have to convert it to 0.021

        const schemaEvents: LiteEventSchemaType[] = [];
        const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
        const schemaEventSales: Map<
          LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
          LiteEventSalesSchemaType
        > = new Map();

        // Fetch all tickets at once for this serie
        const productTicketsResponse = await fetch(this.formatUrl(`/externalOrderHistoryService/v1_33/listTicketsByCriteria`), {
          method: 'POST',
          headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
          body: JSON.stringify({
            ticketFilterCriteria: {
              pointOfSalesId: pointOfSaleId,
              productId: product.id,
              // Dates range are mandatory so using a safe margin
              startDate: set(new Date(0), { year: 2010, month: 1, date: 1 }),
              endDate: addYears(new Date(), 1),
            },
          }),
        });

        if (!productTicketsResponse.ok) {
          const error = await productTicketsResponse.json();

          throw error;
        }

        const productTicketsDataJson = await productTicketsResponse.json();
        const productTicketsData = JsonListTicketsByCriteriaResponseSchema.parse(productTicketsDataJson);

        for (const performance of product.event.performances) {
          // Only synchronize events that are not considered as cancelled
          if (product.state === 'CANCELED' || product.state === 'CANCELED_CLOSED') {
            continue;
          }

          schemaEvents.push(
            LiteEventSchema.parse({
              internalTicketingSystemId: performance.id.toString(),
              startAt: performance.start,
              endAt: performance.duration
                ? addSeconds(performance.start, performance.duration)
                : // Doing as ticketing system Mapado that is setting by default the end date to the end of the night
                  set(addDays(performance.start, 1), { hours: 5, minutes: 0, seconds: 0, milliseconds: 0 }),
            })
          );

          const performanceTickets = productTicketsData.ticketSummaries.filter((ticket) => {
            return ticket.performanceId === performance.id;
          });

          // Reference the ticket categories to be bound to tickets after
          for (const price of performance.prices) {
            // Unique ID to be retrieved
            const uniqueTicketCategoryId = `${price.seatCatId}_${price.audSubCatId}`;

            let ticketCategory = schemaTicketCategories.get(uniqueTicketCategoryId);

            if (!ticketCategory) {
              const seatCategory = performance.seatCategories.find((seatCategory) => {
                return seatCategory.id === price.seatCatId;
              });

              assert(seatCategory);

              const seatCategoryExternalNameTranslation = seatCategory.externalName.translations.find((translation) => {
                // For now only consider the french entry or default to the internal code
                return translation.locale === 'fr';
              });

              const seatCategoryName: string = seatCategoryExternalNameTranslation ? seatCategoryExternalNameTranslation.value : seatCategory.code;

              const audienceSubcategory = existingAudienceSubcategories.get(price.audSubCatId);

              assert(audienceSubcategory);

              const audienceSubcategoryExternalNameTranslation = seatCategory.externalName.translations.find((translation) => {
                // For now only consider the french entry or default to the internal code
                return translation.locale === 'fr';
              });

              const audienceSubcategoryName: string = audienceSubcategoryExternalNameTranslation
                ? audienceSubcategoryExternalNameTranslation.value
                : seatCategory.code;

              ticketCategory = LiteTicketCategorySchema.parse({
                internalTicketingSystemId: uniqueTicketCategoryId,
                name: `${seatCategoryName} - ${audienceSubcategoryName}`,
                description: null,
                price: price.amount / 1000, // Since 4000 = 4€, we have to convert it
              });

              schemaTicketCategories.set(uniqueTicketCategoryId, ticketCategory);
            } else {
              // Make sure the registered ticket category has the same amount
              assert(ticketCategory.price === price.amount / 1000);
            }
          }

          for (const ticket of performanceTickets) {
            // Since with Secutix a same pricing category (= subcategory) can be of multiple variations (= categories)
            // We make sure to concatenate them so they match our own data model
            const uniqueTicketCategoryId = `${ticket.seatCategoryId}_${ticket.audienceSubCategoryId}`;

            // Do not consider a cancelled ticket
            if (ticket.ticketState === 'CANCELLED') {
              continue;
            }

            const ticketCategory = schemaTicketCategories.get(uniqueTicketCategoryId);

            assert(ticketCategory);

            // Increment category sales
            const uniqueEventSalesId = `${performance.id.toString()}_${ticketCategory.internalTicketingSystemId}`;

            let eventSales = schemaEventSales.get(uniqueEventSalesId);

            if (!eventSales) {
              schemaEventSales.set(
                uniqueEventSalesId,
                LiteEventSalesSchema.parse({
                  internalEventTicketingSystemId: performance.id.toString(),
                  internalTicketCategoryTicketingSystemId: ticketCategory.internalTicketingSystemId,
                  total: 1,
                })
              );
            } else {
              eventSales.total += 1;
            }
          }
        }

        const productExternalNameTranslation = product.externalName.translations.find((translation) => {
          // For now only consider the french entry or default to the internal code
          return translation.locale === 'fr';
        });

        const eventSerieName: string = productExternalNameTranslation ? productExternalNameTranslation.value : product.code;

        // Calculate the date range for the event serie
        let serieStartDate: Date | null = null;
        let serieEndDate: Date | null = null;

        for (const schemaEvent of schemaEvents) {
          if (serieStartDate === null || isBefore(schemaEvent.startAt, serieStartDate)) {
            serieStartDate = schemaEvent.startAt;
          }

          if (serieEndDate === null || isAfter(schemaEvent.endAt, serieEndDate)) {
            serieEndDate = schemaEvent.endAt;
          }
        }

        assert(serieStartDate !== null && serieEndDate !== null);

        eventsSeriesWrappers.push({
          serie: LiteEventSerieSchema.parse({
            internalTicketingSystemId: product.id.toString(),
            name: eventSerieName,
            startAt: serieStartDate,
            endAt: serieEndDate,
            taxRate: taxRate,
          }),
          events: schemaEvents,
          ticketCategories: Array.from(schemaTicketCategories.values()),
          sales: Array.from(schemaEventSales.values()),
        });
      });
    }

    return eventsSeriesWrappers;
  }
}
