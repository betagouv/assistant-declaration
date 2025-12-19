import { eachOfLimit } from 'async';
import Bottleneck from 'bottleneck';
import { addYears, hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds } from 'date-fns';
import { ClientCredentials } from 'simple-oauth2';

import { HelloAssoApiV5ModelsStatisticsItem, HelloAssoApiV5ModelsStatisticsOrder } from '@ad/src/client/helloasso';
import { Client, createClient, createConfig } from '@ad/src/client/helloasso/client';
import {
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugItems,
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugPublic,
  getOrganizationsByOrganizationSlugOrders,
  getUsersMeOrganizations,
} from '@ad/src/client/helloasso/sdk.gen';
import { getExcludingTaxesAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { helloassoMissingTierError } from '@ad/src/models/entities/errors';
import { LiteEventSchema, LiteEventSerieSchema, LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonTokenSchema } from '@ad/src/models/entities/helloasso';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

// HelloAsso documentation at https://dev.helloasso.com/reference/
export class HelloassoTicketingSystemClient implements TicketingSystemClient {
  public baseUrl: string;
  protected usingTestEnvironnement = false;
  protected readonly client: Client;
  protected readonly authClient: ClientCredentials;
  protected readonly maximumItemsPerPage: number = 100; // That's the limit required by the API after test
  protected requestsPer10SecondsLimit = 10;
  protected requestsPer10MinutesLimit = 10;
  protected requestsPerHourLimit = 50;
  protected requestsLimiter: Bottleneck;

  constructor(accessKey: string, secretKey: string, useTestEnvironment: boolean) {
    this.baseUrl = useTestEnvironment ? 'https://api.helloasso-sandbox.com' : 'https://api.helloasso.com';

    this.client = createClient(
      createConfig({
        baseUrl: `${this.baseUrl}/v5`, // The API must be specified for business endpoints but not for the authentication ones
        fetch: this.rateLimitedFetch.bind(this),
      })
    );

    this.authClient = new ClientCredentials({
      client: {
        id: accessKey,
        secret: secretKey,
      },
      auth: {
        tokenHost: this.baseUrl,
        tokenPath: '/oauth2/token',
      },
      options: {
        authorizationMethod: 'body',
      },
    });

    // HelloAsso requires multiple rate limit conditions when fetching their API
    this.requestsLimiter = new Bottleneck({
      reservoir: this.requestsPer10SecondsLimit,
      reservoirRefreshAmount: this.requestsPer10SecondsLimit,
      reservoirRefreshInterval: secondsToMilliseconds(10),
    })
      .chain(
        new Bottleneck({
          reservoir: this.requestsPer10MinutesLimit,
          reservoirRefreshAmount: this.requestsPer10MinutesLimit,
          reservoirRefreshInterval: minutesToMilliseconds(10),
        })
      )
      .chain(
        new Bottleneck({
          reservoir: this.requestsPerHourLimit,
          reservoirRefreshAmount: this.requestsPerHourLimit,
          reservoirRefreshInterval: hoursToMilliseconds(1),
        })
      )
      .chain(
        new Bottleneck({
          maxConcurrent: 5, // in case of parallel forms processing, limit concurrent requests
        })
      );
  }

  protected async rateLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return await this.requestsLimiter.schedule(() => fetch(input, init));
  }

  protected assertCollectionResponseValid<
    E extends {
      data: Array<any> | null;
      pagination: {
        pageSize: number;
        totalCount: number;
        pageIndex: number;
        totalPages: number;
        continuationToken: string | null;
      };
    },
    R extends {
      data?: E;
    },
  >(collectionResult: R): asserts collectionResult is R & { data: E } {
    if (!collectionResult.data || collectionResult.data.pagination.pageSize !== this.maximumItemsPerPage) {
      throw new Error('something seems wrong with pagination result');
    }
  }

  public async login(): Promise<{ accessToken: string; organizationSlug: string }> {
    const tokenResult = await this.authClient.getToken({});

    const token = JsonTokenSchema.parse(tokenResult.token);

    const organizationsResult = await getUsersMeOrganizations({
      client: this.client,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    if (!organizationsResult.response.ok) {
      throw organizationsResult.response.text();
    } else if (organizationsResult.error) {
      throw JSON.stringify(organizationsResult.error);
    }

    assert(organizationsResult.data);

    if (organizationsResult.data.length !== 1) {
      throw new Error(`vos identifiants HelloAsso doivent être reliés qu'à une unique organisation`);
    }

    assert(organizationsResult.data[0].organizationSlug);

    return {
      accessToken: token.access_token,
      organizationSlug: organizationsResult.data[0].organizationSlug,
    };
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection
      const { accessToken, organizationSlug } = await this.login();

      // We fetch the minimum of information since it's just to test the connection, so using a period range that would return no statement
      const futureDate = addYears(new Date(), 2);

      const itemsResult = await getOrganizationsByOrganizationSlugOrders({
        client: this.client,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        path: {
          organizationSlug: organizationSlug,
        },
        query: {
          from: futureDate.toISOString(),
          to: futureDate.toISOString(),
          pageSize: 1,
        },
      });

      if (!itemsResult.response.ok) {
        throw itemsResult.response.text();
      } else if (itemsResult.error) {
        throw JSON.stringify(itemsResult.error);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const { accessToken, organizationSlug } = await this.login();

    // Get tickets modifications to know which events to synchronize (for the first time, or again)
    const recentOrders: HelloAssoApiV5ModelsStatisticsOrder[] = [];

    let recentOrdersCurrentCursor: string = ''; // The cursor cannot be nullable otherwise it breaks request types for whatever reason despite casting...

    while (true) {
      const recentOrdersResult = await getOrganizationsByOrganizationSlugOrders({
        client: this.client,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        path: {
          organizationSlug: organizationSlug,
        },
        query: {
          formTypes: ['Event'],
          from: fromDate.toISOString(),
          ...(toDate ? { to: toDate.toISOString() } : {}),
          sortOrder: 'Desc', // No `sortField` to choose updated property
          withCount: true,
          pageSize: this.maximumItemsPerPage,
          continuationToken: recentOrdersCurrentCursor === '' ? undefined : recentOrdersCurrentCursor,
        },
      });

      if (!recentOrdersResult.response.ok) {
        throw recentOrdersResult.response.text();
      } else if (recentOrdersResult.error) {
        throw JSON.stringify(recentOrdersResult.error);
      }

      this.assertCollectionResponseValid(recentOrdersResult);
      assert(recentOrdersResult.data.data);

      recentOrders.push(...recentOrdersResult.data.data);

      if (
        !recentOrdersResult.data.pagination.continuationToken ||
        // [WORKAROUND] There is no explicit marker for the end of pagination so relying on this weird value
        // Ref: https://github.com/HelloAsso/helloasso-node/issues/2
        recentOrdersResult.data.pagination.totalPages === 1 ||
        // Also add a security in case they change their logic
        recentOrdersResult.data.pagination.continuationToken === recentOrdersCurrentCursor
      ) {
        break;
      }

      // Adjust to fetch the next page
      recentOrdersCurrentCursor = recentOrdersResult.data.pagination.continuationToken;
    }

    // Since there is no filter in the query we make sure keeping only items (sales) for events (form type)
    const formsSlugsToSynchronize: string[] = [
      ...new Set(
        recentOrders.map((recentOrder) => {
          assert(recentOrder.formSlug);

          return recentOrder.formSlug;
        })
      ),
    ];

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(formsSlugsToSynchronize, 1, async (formSlug) => {
      const formResult = await getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugPublic({
        client: this.client,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        path: {
          organizationSlug: organizationSlug,
          formType: 'Event',
          formSlug: formSlug,
        },
      });

      if (!formResult.response.ok) {
        throw formResult.response.text();
      } else if (formResult.error) {
        throw JSON.stringify(formResult.error);
      }

      assert(formResult.data);
      assert(formResult.data.formSlug);
      assert(formResult.data.title);

      // Some users use `Event` type to sell things not dated, potentially things that are not events
      // So instead of throwing an error we just ignore them
      if (!formResult.data.startDate) {
        return;
      } else if (formResult.data.currency !== 'EUR') {
        // Also ignore events not targeting the right currency
        return;
      }

      const startDate = new Date(formResult.data.startDate);
      const endDate = formResult.data.endDate ? new Date(formResult.data.endDate) : null;

      let indicativeTaxRate: number | null = null;
      const tierdIdToTaxRateAndAmount = new Map<
        number,
        {
          taxRate: number;
          amount: number | null;
        }
      >();

      if (formResult.data.tiers) {
        for (const tier of formResult.data.tiers) {
          if (tier.tierType !== 'Registration') {
            // It seems other types should be ignored to only keep ones related to events
            continue;
          }

          tierdIdToTaxRateAndAmount.set(tier.id, {
            taxRate: tier.vatRate / 100, // Receiving 5.50 for 5.5%
            amount: tier.price ? tier.price / 100 : null, // 2000 is 20€
          });
        }

        // Note: a tier being free may have a 0% tax rate instead of being aligned with others, to take into account this case
        // it's easier having them at the end (because if only free tiers, the tax rate should be 0, not null)
        const validTiersSortedWithDescendingTaxRates = Array.from(tierdIdToTaxRateAndAmount.values()).sort((a, b) => +b.taxRate - +a.taxRate);

        for (const tier of validTiersSortedWithDescendingTaxRates) {
          let tierVatRate = tier.taxRate;

          if (indicativeTaxRate !== null) {
            // See comment about sorting tiers to understand why alignin tax rates when price is 0
            if (tier.amount === 0 && tier.taxRate === 0) {
              tierVatRate = indicativeTaxRate;
            }

            // If the event mixes multiple tax rates set it to null since we are not managing this
            // Unfortunately it will cause the excluding taxes total being wrong but we are fine letting the end user correcting this
            if (indicativeTaxRate !== tierVatRate) {
              indicativeTaxRate = null;

              break;
            }
          }

          indicativeTaxRate = tierVatRate;
        }
      }

      // It's important to note HelloAsso is having only "1 event serie = 1 event" (there is no multiple representations for the same serie)
      // We could have tried to merged them based on naming but it's kind of tricky before knowing well their customer usage of it
      const schemaEvent = LiteEventSchema.parse({
        internalTicketingSystemId: formResult.data.formSlug,
        startAt: startDate,
        endAt: endDate,
        ticketingRevenueIncludingTaxes: 0,
        ticketingRevenueExcludingTaxes: 0,
        ticketingRevenueTaxRate: indicativeTaxRate,
        freeTickets: 0,
        paidTickets: 0,
      });

      // Retrieve tickets to count the totals
      // TODO: it's not the exact type due to missing one from their OpenAPI schema, but almost the same so reusing it
      const soldItems: Required<HelloAssoApiV5ModelsStatisticsItem>[] = [];

      let soldItemsCurrentCursor: string = ''; // The cursor cannot be nullable otherwise it breaks request types for whatever reason despite casting...

      while (true) {
        const soldItemsResult = await getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugItems({
          client: this.client,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          path: {
            organizationSlug: organizationSlug,
            formType: 'Event',
            formSlug: formSlug,
          },
          query: {
            tierTypes: ['Registration'],
            itemStates: ['Processed', 'Registered'],
            sortField: 'UpdateDate',
            sortOrder: 'Desc', // No `sortField` to choose updated property
            withCount: true,
            pageSize: this.maximumItemsPerPage,
            continuationToken: soldItemsCurrentCursor === '' ? undefined : soldItemsCurrentCursor,
          },
        });

        if (!soldItemsResult.response.ok) {
          throw soldItemsResult.response.text();
        } else if (soldItemsResult.error) {
          throw JSON.stringify(soldItemsResult.error);
        }

        // TODO: their OpenAPI schema is wrong saying `unknown` whereas it should be, so using intermediate variable
        // Ref: https://github.com/HelloAsso/helloasso-open-api/issues/15
        this.assertCollectionResponseValid(soldItemsResult as any);
        const soldItemsResultData = soldItemsResult.data as any;
        assert(soldItemsResultData.data);
        // this.assertCollectionResponseValid(soldItemsResult);
        // assert(soldItemsResult.data.data);

        soldItems.push(...soldItemsResultData.data);

        if (
          !soldItemsResultData.pagination.continuationToken ||
          // [WORKAROUND] There is no explicit marker for the end of pagination so relying on this weird value
          // Ref: https://github.com/HelloAsso/helloasso-node/issues/2
          soldItemsResultData.pagination.totalPages === 1 ||
          // Also add a security in case they change their logic
          soldItemsResultData.pagination.continuationToken === soldItemsCurrentCursor
        ) {
          break;
        }

        // Adjust to fetch the next page
        soldItemsCurrentCursor = soldItemsResultData.pagination.continuationToken;
      }

      for (const ticketItem of soldItems) {
        assert(ticketItem.tierId, 'the tier ID should be set on tickets');

        const tierProperties = tierdIdToTaxRateAndAmount.get(ticketItem.tierId);
        const ticketPriceIncludingTaxes = ticketItem.amount / 100; // 2000 is 20€

        if (ticketPriceIncludingTaxes === 0) {
          schemaEvent.freeTickets++;
        } else if (tierProperties === undefined) {
          // The public form entity sometimes does not include all tiers (maybe they are deleted or disabled?)
          // and we have no other way to find them. Without this, there is no way to get the used tax rate to properly
          // calculate the including taxes amount. So we throw a user facing error in the meantime...
          // Notes:
          // - Order entity contains a `vat` field but this one is not the percentage, it's a vat amount for the whole order so we cannot infer the vat for this specific ticket (= this specific order item)
          // - HelloAsso has been contacted about this issue
          throw helloassoMissingTierError;
        } else {
          schemaEvent.paidTickets++;
          schemaEvent.ticketingRevenueIncludingTaxes += ticketPriceIncludingTaxes;
          schemaEvent.ticketingRevenueExcludingTaxes += getExcludingTaxesAmountFromIncludingTaxesAmount(
            ticketPriceIncludingTaxes,
            tierProperties.taxRate
          );
        }
      }

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: formResult.data.formSlug,
          name: formResult.data.title,
        }),
        events: [schemaEvent],
      });
    });

    return eventsSeriesWrappers;
  }
}
