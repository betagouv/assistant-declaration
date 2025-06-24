import { eachOfLimit } from 'async';
import Bottleneck from 'bottleneck';
import { addDays, addYears, hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds, set } from 'date-fns';
import { ClientCredentials } from 'simple-oauth2';

import { HelloAssoApiV5ModelsStatisticsOrder } from '@ad/src/client/helloasso';
import { Client, createClient, createConfig } from '@ad/src/client/helloasso/client';
import {
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugItems,
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugPublic,
  getOrganizationsByOrganizationSlugOrders,
  getUsersMeOrganizations,
} from '@ad/src/client/helloasso/sdk.gen';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
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
    this.baseUrl = useTestEnvironment ? 'https://api.helloasso-sandbox.com/v5' : 'https://api.helloasso.com/v5';

    this.client = createClient(
      createConfig({
        baseUrl: this.baseUrl,
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
    const tokenResult = await this.authClient.getToken({
      scope: '',
    });

    const token = JsonTokenSchema.parse(tokenResult.token);

    const organizationsResult = await getUsersMeOrganizations({
      client: this.client,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    if (organizationsResult.error) {
      throw organizationsResult.error;
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

      if (itemsResult.error) {
        throw itemsResult.error;
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

    let recentOrdersCurrentCursor: string | null = null;

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
          pageSize: this.maximumItemsPerPage,
          sortOrder: 'Desc', // No `sortField` to choose updated property
          withCount: true,
        },
      });

      if (recentOrdersResult.error) {
        throw recentOrdersResult.error;
      }

      this.assertCollectionResponseValid(recentOrdersResult);
      assert(recentOrdersResult.data.data);

      // console.log(4444444444);
      // console.log(recentOrdersResult.data.data);

      recentOrders.push(...recentOrdersResult.data.data);

      if (!recentOrdersResult.data.pagination.continuationToken) {
        break;
      }

      // Adjust to fetch the next page
      recentOrdersCurrentCursor = recentOrdersResult.data.pagination.continuationToken;
    }

    // Since there is no filter in the query we make sure keeping only items (sales) for events (form type)
    const formsSlugsToSynchronize: string[] = [];

    for (const recentOrder of recentOrders) {
      assert(recentOrder.formSlug);

      formsSlugsToSynchronize.push(recentOrder.formSlug);
    }

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

      if (formResult.error) {
        throw formResult.error;
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

      if (formResult.data.tiers) {
        for (const tier of formResult.data.tiers) {
          if (tier.tierType !== 'Registration') {
            // It seems other types should be ignored to only keep ones related to events
            continue;
          }

          const ticketCategory = LiteTicketCategorySchema.parse({
            internalTicketingSystemId: tier.id.toString(),
            name: tier.label ?? `Tarif n°${tier.id}`,
            description: null,
            price: tier.price !== null ? tier.price / 100 : 0, // 2000 is 20€
          });

          schemaTicketCategories.set(ticketCategory.internalTicketingSystemId, ticketCategory);

          const tierVatRate = tier.vatRate / 100; // Receiving 5.50 for 5.5%

          // TODO: for now we manage a unique tax rate per event serie whereas it should be by ticket category
          if (taxRate === null) {
          } else if (taxRate !== tierVatRate) {
            // throw new Error(`an event serie should have the same tax rate for all categories`)

            // [WORKAROUND] Until we decide the right way to do, just keep a tax rate none null
            taxRate = Math.max(taxRate, tierVatRate);
          }
        }
      }

      // TODO: should be tested

      // Get tickets modifications to know which events to synchronize (for the first time, or again)
      const soldItems: HelloAssoApiV5ModelsStatisticsOrder[] = [];

      let soldItemsCurrentCursor: string | null = null;

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
            pageSize: this.maximumItemsPerPage,
            sortField: 'CreationDate',
            sortOrder: 'Desc', // No `sortField` to choose updated property
            withCount: true,
          },
        });

        if (soldItemsResult.error) {
          throw soldItemsResult.error;
        }

        this.assertCollectionResponseValid(soldItemsResult);
        assert(soldItemsResult.data.data);

        // console.log(4444444444);
        // console.log(soldItemsResult.data.data);

        soldItems.push(...soldItemsResult.data.data);

        if (!soldItemsResult.data.pagination.continuationToken) {
          break;
        }

        // Adjust to fetch the next page
        soldItemsCurrentCursor = soldItemsResult.data.pagination.continuationToken;
      }

      // TODO:
      // TODO: we should then be able to retrieve the total for each tier?
      // TODO: or maybe we had to get orders from form? needs data to test it...
      // TODO:

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
