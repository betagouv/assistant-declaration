import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { ClientCredentials } from 'simple-oauth2';

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

  public async login(): Promise<string> {
    const token = await this.authClient.getToken({
      scope: '',
    });

    assert(typeof token.token === 'string');

    return token.token;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.login();

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const accessToken = await this.login();

    return [];
  }
}
