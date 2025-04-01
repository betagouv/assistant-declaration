import { eachOfLimit } from 'async';
import { addDays, addSeconds, addYears, isAfter, isBefore, set } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
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
    const baseUrl = `https://cube.demo-ws.secutix.com/${pathnamePrefix}/backend-apis`;

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
          (toDate
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

          for (const ticket of performanceTickets) {
            // [WORKAROUND] It seems the API does not allow retrieving ticket subcategory (adult, kid...)
            // so we retrieve them through the ticket. It means if a subcategory is not sold for a product we won't be able to list it
            // Note: we do this before filtering the ticket state to increase chance of getting more subcategories

            // Since with Secutix a same pricing category (= subcategory) can be of multiple variations (= categories)
            // We make sure to concatenate them so they match our own data model
            const uniqueTicketCategoryId = `${ticket.seatCategoryId}_${ticket.audienceSubCategoryId}`;

            // Register this category if not yet processed
            let ticketCategory = schemaTicketCategories.get(uniqueTicketCategoryId);

            if (!ticketCategory) {
              const seatCategory = performance.seatCategories.find((seatCategory) => {
                return seatCategory.id === ticket.seatCategoryId;
              });

              assert(seatCategory);

              const categoryExternalNameTranslation = seatCategory.externalName.translations.find((translation) => {
                // For now only consider the french entry or default to the internal code
                return translation.locale === 'fr';
              });

              const categoryName: string = categoryExternalNameTranslation ? categoryExternalNameTranslation.value : seatCategory.code;

              const categoryPrice = performance.prices.find((price) => {
                return price.seatCatId === ticket.seatCategoryId && price.audSubCatId === ticket.audienceSubCategoryId;
              });

              assert(categoryPrice);

              ticketCategory = LiteTicketCategorySchema.parse({
                internalTicketingSystemId: uniqueTicketCategoryId,
                name: `${categoryName} - ${ticket.audienceSubCategory}`,
                description: null,
                price: categoryPrice.amount / 1000, // Since 4000 = 4€, we have to convert it
              });

              schemaTicketCategories.set(uniqueTicketCategoryId, ticketCategory);
            }

            // Do not consider a cancelled ticket
            if (ticket.ticketState === 'CANCELLED') {
              continue;
            }

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
            taxRate: 0, // TODO: ...
          }),
          events: schemaEvents,
          ticketCategories: Array.from(schemaTicketCategories.values()),
          sales: Array.from(schemaEventSales.values()),
        });
      });

      // listVatCodes seems to not exist... whereas documented https://platform.secutix.com/backend/setup
      // maybe it's the same for ticketsCategories
      // ou https://mosa.demo-ws.secutix.com/tnseb/apidocs/CatalogService_latest.html ?
      // faudrait refetch le global...

      // TODO: tax rate

      // maybe https://platform.secutix.com/swagger/ with dataExportService could help?
      // but trying to list available ones returns "forbidden"

      // product.ticketModelId ... ? could give good idea of categories?

      // TODO:
      // TODO:
      // TODO: if getting "sub audience category" (adult/youth...) only with tickets there is a risk
      // TODO: of missing pricing category name if no sale for a specific one... (but maybe there is no endpoint for this :/)
      // TODO: https://platform.secutix.com/backend/sales/glossary --> "tariff"
      // TODO:
      // TODO:
      // TODO: faut-il qu'un "event" ait un endDate nullable ? Pour coller à plusieurs ticketingSystem ?
      // TODO: bizarre sinon d'utiliser un placeholder "5h du matin après" si jamais y'avait des calculs statistiques derrière ?
      // TODO: (et même dans la UI...)... créer une issue dans le backlog ?
      // TODO:
    }

    return eventsSeriesWrappers;
  }
}
