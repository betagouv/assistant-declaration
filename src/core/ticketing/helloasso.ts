import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { eachOfLimit } from 'async';
import { addYears } from 'date-fns';
import { ClientCredentials } from 'simple-oauth2';

import {
  getOrganizationsByOrganizationSlugFormsByFormTypeByFormSlugPublic,
  getOrganizationsByOrganizationSlugOrders,
  getUsersMeOrganizations,
} from '@ad/src/client/helloasso';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class HelloassoTicketingSystemClient implements TicketingSystemClient {
  public baseUrl: string;
  protected usingTestEnvironnement = false;
  protected readonly client: Client;
  protected readonly authClient: ClientCredentials;
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;

  constructor(accessKey: string, secretKey: string, useTestEnvironment: boolean) {
    this.baseUrl = useTestEnvironment ? 'https://api.helloasso-sandbox.com' : 'https://api.helloasso.com';

    this.client = createClient(
      createConfig({
        baseUrl: this.baseUrl,
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
  }

  protected assertCollectionResponseValid(collectionResult: {
    data?: {
      data?: Array<any> | null;
      pagination?: {
        pageSize?: number;
        totalCount?: number;
      };
    };
  }) {
    if (
      !collectionResult.data ||
      !collectionResult.data.data ||
      !Array.isArray(collectionResult.data.data)
      // !collectionResult.data.pagination?.pageSize ||
      // collectionResult.data.pagination.totalCount === undefined ||
      // collectionResult.data.pagination.pageSize !== this.itemsPerPageToAvoidPagination ||
      // collectionResult.data.pagination.totalCount > this.itemsPerPageToAvoidPagination
    ) {
      throw new Error('avoiding pagination has failed fetching all items');
    }
  }

  public async login(): Promise<{ accessToken: string; organizationSlug: string }> {
    const token = await this.authClient.getToken({
      scope: '',
    });

    assert(typeof token.token === 'string');

    const accessToken = token.token;

    const organizationsResult = await getUsersMeOrganizations({
      client: this.client,
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
      accessToken: accessToken,
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

    // TODO
    // TODO
    // TODO
    // TODO
    // why using assertCollectionResponseValid
    // is not adjusting type by default? whereas it works here... makes no sense
    //
    // function needs to extends the form ?
    //
    //

    // recentOrdersResult.data?.data;

    if (
      !recentOrdersResult.data ||
      !recentOrdersResult.data.data ||
      !Array.isArray(recentOrdersResult.data.data)
      // !recentOrdersResult.data.pagination?.pageSize ||
      // recentOrdersResult.data.pagination.totalCount === undefined ||
      // recentOrdersResult.data.pagination.pageSize !== this.itemsPerPageToAvoidPagination ||
      // recentOrdersResult.data.pagination.totalCount > this.itemsPerPageToAvoidPagination
    ) {
      throw new Error('avoiding pagination has failed fetching all items');
    }

    // recentOrdersResult.data.data[0];

    // if (recentOrdersResult.data && Array.isArray(recentOrdersResult.data.data)) {
    //   //
    //   recentOrdersResult.data.data;
    // }

    // tried everything... phoque typings :D

    // TEST
    // TEST
    // TEST
    // TEST probably due to not using generics?
    // TEST
    // TEST
    // TEST

    this.assertCollectionResponseValid(recentOrdersResult);

    // TODO: test
    // TODO: test
    recentOrdersResult.data.data;
    // TODO: test
    // TODO: test
    // TODO: test

    const recentOrders = recentOrdersResult.data;

    // Since there is no filter in the query we make sure keeping only items (sales) for events (form type)
    const formsSlugsToSynchronize: string[] = [];

    for (const recentOrder of recentOrders) {
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

    // TODO: 10 calls every 10 seconds...
    // so we need the lib of the other day

    return [];
  }
}
