import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { ClientCredentials } from 'simple-oauth2';

import { getUsersMeOrganizations } from '@ad/src/client/helloasso';
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
      const accessToken = await this.login();

      // TODO:
      // TODO:
      // TODO: fetch minimal info as for Rodrigue
      // TODO:
      // TODO:

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const accessToken = await this.login();

    // TODO: 10 calls every 10 seconds...
    // so we need the lib of the other day

    return [];
  }
}
