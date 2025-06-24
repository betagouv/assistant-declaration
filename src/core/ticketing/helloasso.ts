import { eachOfLimit } from 'async';
import Bottleneck from 'bottleneck';
import { addYears, hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds } from 'date-fns';
import { ClientCredentials } from 'simple-oauth2';

import { Client, createClient, createConfig } from '@ad/src/client/helloasso/client';
import {
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugPublic,
  getOrganizationsByOrganizationSlugOrders,
  getUsersMeOrganizations,
} from '@ad/src/client/helloasso/sdk.gen';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import { JsonTokenSchema } from '@ad/src/models/entities/helloasso';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class HelloassoTicketingSystemClient implements TicketingSystemClient {
  public baseUrl: string;
  protected usingTestEnvironnement = false;
  protected readonly client: Client;
  protected readonly authClient: ClientCredentials;
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;
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
      };
    },
    R extends {
      data?: E;
    },
  >(collectionResult: R): asserts collectionResult is R & { data: E } {
    if (
      !collectionResult.data ||
      collectionResult.data.pagination.pageSize !== this.itemsPerPageToAvoidPagination ||
      collectionResult.data.pagination.totalCount > this.itemsPerPageToAvoidPagination
    ) {
      throw new Error('avoiding pagination has failed fetching all items');
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
          from: futureDate.toString(),
          to: futureDate.toString(),
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
        from: fromDate.toString(),
        ...(toDate ? { to: toDate.toString() } : {}),
        pageSize: this.itemsPerPageToAvoidPagination,
        sortOrder: 'Desc', // No `sortField` to choose updated property
        withCount: true,
      },
    });

    if (recentOrdersResult.error) {
      throw recentOrdersResult.error;
    }

    this.assertCollectionResponseValid(recentOrdersResult);
    assert(recentOrdersResult.data.data);

    const recentOrders = recentOrdersResult.data.data;

    // Since there is no filter in the query we make sure keeping only items (sales) for events (form type)
    const formsSlugsToSynchronize: string[] = [];

    for (const recentOrder of recentOrders) {
      assert(recentOrder.formSlug);

      formsSlugsToSynchronize.push(recentOrder.formSlug);
    }

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

      const form = formResult as any;
    });

    return [];
  }
}
