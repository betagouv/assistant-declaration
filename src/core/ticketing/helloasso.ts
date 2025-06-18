import { eachOfLimit } from 'async';
import Bottleneck from 'bottleneck';
import { addDays, addYears, hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds, set } from 'date-fns';
import { ClientCredentials } from 'simple-oauth2';

import { HelloAssoApiV5ModelsStatisticsItem, HelloAssoApiV5ModelsStatisticsOrder } from '@ad/src/client/helloasso';
import { Client, createClient, createConfig } from '@ad/src/client/helloasso/client';
import {
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugItems,
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugPublic,
  getOrganizationsByOrganizationSlugOrders,
  getUsersMeOrganizations,
} from '@ad/src/client/helloasso/sdk.gen';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { helloassoMissingTierError } from '@ad/src/models/entities/errors';
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
import { JsonTokenSchema } from '@ad/src/models/entities/helloasso';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

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

      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      assert(formResult.data.formSlug);
      assert(formResult.data.title);
      assert(formResult.data.currency === 'EUR');
      assert(formResult.data.startDate);

      const startDate = new Date(formResult.data.startDate);

      let endDate: Date;
      if (formResult.data.endDate !== null) {
        endDate = new Date(formResult.data.endDate);
      } else {
        // Doing as ticketing system Mapado that is setting by default the end date to the end of the night
        endDate = set(addDays(startDate, 1), { hours: 5, minutes: 0, seconds: 0, milliseconds: 0 });
      }

      // It's important to note Shotgun is having only "1 event serie = 1 event" (there is no multiple representations for the same serie)
      // We could have tried to merged them based on naming but it's kind of tricky before knowing well their customer usage of it
      schemaEvents.push(
        LiteEventSchema.parse({
          internalTicketingSystemId: formResult.data.formSlug,
          startAt: startDate,
          endAt: endDate,
        })
      );

      let taxRate: number | null = null;

      const dynamicTierIds: number[] = [];

      if (formResult.data.tiers) {
        for (const tier of formResult.data.tiers) {
          if (tier.tierType !== 'Registration') {
            // It seems other types should be ignored to only keep ones related to events
            continue;
          }

          const tierVatRate = tier.vatRate / 100; // Receiving 5.50 for 5.5%

          // TODO: for now we manage a unique tax rate per event serie whereas it should be by ticket category
          if (taxRate === null) {
            taxRate = tierVatRate;
          } else if (taxRate !== tierVatRate) {
            // throw new Error(`an event serie should have the same tax rate for all categories`)

            // [WORKAROUND] Until we decide the right way to do, just keep a tax rate none null
            taxRate = Math.max(taxRate, tierVatRate);
          }

          // If there is no price on the tier, it means it's a "pay as you go" so ticket categories will be created
          // while retrieving bought tickets for this tier
          if (tier.price === null) {
            dynamicTierIds.push(tier.id);

            continue;
          }

          const ticketCategory = LiteTicketCategorySchema.parse({
            internalTicketingSystemId: tier.id.toString(),
            name: tier.label ?? `Tarif n°${tier.id}`,
            description: null,
            price: tier.price !== null ? tier.price / 100 : 0, // 2000 is 20€
          });

          schemaTicketCategories.set(ticketCategory.internalTicketingSystemId, ticketCategory);
        }
      }

      const sortedDynamicTierIds = dynamicTierIds.sort(); // To always have the same labels on virtual ticket categories

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

      // HelloAsso does not allow modifying a ticket category once there is an order for it
      // but since it allows a "pay as you want" type of ticket, we have to use our own duplication logic
      // to split all those different amounts
      // TODO: for now we are not managing discounts on the ticket category price, this should end with duplication logic
      for (const ticketItem of soldItems) {
        let eventSalesId: string;

        // Consider "pay as you want" specifically to create virtual categories, and consider the rest as having its tier existing
        if (ticketItem.priceCategory === 'Pwyw') {
          const dynamicTierIdIndex = ticketItem.tierId !== null ? sortedDynamicTierIds.indexOf(ticketItem.tierId) : -1;

          if (dynamicTierIdIndex === -1) {
            throw new Error(`the "pay as you want" ticket should be bound to a tier`);
          }

          const virtualTicketCategoryId = `${ticketItem.tierId}_${ticketItem.amount}`;

          // If not existing create this virtual ticket category
          if (!schemaTicketCategories.has(virtualTicketCategoryId)) {
            const ticketCategory = LiteTicketCategorySchema.parse({
              internalTicketingSystemId: virtualTicketCategoryId,
              name: `${ticketItem.name ?? `Tarif libre`} (n°${dynamicTierIdIndex + 1})`,
              description: null,
              price: ticketItem.amount / 100, // 2000 is 20€
            });

            schemaTicketCategories.set(ticketCategory.internalTicketingSystemId, ticketCategory);
          }

          eventSalesId = virtualTicketCategoryId;
        } else {
          assert(ticketItem.tierId !== null);

          eventSalesId = ticketItem.tierId.toString();
        }

        const ticketCategory = schemaTicketCategories.get(eventSalesId);

        if (!ticketCategory) {
          // TODO: it's weird the tier is not retrieved in the public form request
          // we did contact the HelloAsso support, waiting for an explanation how to manage this
          // In the meantime we are fine since after tests it happened old forms not in our synchronization scope
          // but still we set a proper error in case it's more common than expected
          throw helloassoMissingTierError;
        }

        assert(ticketCategory);

        // Since there is only 1 event per "event serie" for HelloAsso, no need to complexify their map key
        let eventSales = schemaEventSales.get(eventSalesId);

        if (!eventSales) {
          schemaEventSales.set(
            ticketCategory.internalTicketingSystemId,
            LiteEventSalesSchema.parse({
              internalEventTicketingSystemId: formResult.data.formSlug,
              internalTicketCategoryTicketingSystemId: ticketCategory.internalTicketingSystemId,
              total: 1,
            })
          );
        } else {
          eventSales.total += 1;
        }
      }

      assert(taxRate !== null);

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: formResult.data.formSlug,
          name: formResult.data.title,
          startAt: startDate,
          endAt: endDate,
          taxRate: taxRate,
        }),
        events: schemaEvents,
        ticketCategories: Array.from(schemaTicketCategories.values()),
        sales: Array.from(schemaEventSales.values()),
      });
    });

    return eventsSeriesWrappers;
  }
}
