import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonAuthResponseSchema, JsonIsCatalogServiceAliveResponseSchema } from '@ad/src/models/entities/secutix';

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

  // protected assertCollectionResponseValid(data: JsonCollectionSchemaType) {
  //   if (!(typeof data['hydra:totalItems'] === 'number' && data['hydra:totalItems'] <= this.itemsPerPageToAvoidPagination)) {
  //     throw new Error('our workaround to avoid handling pagination logic seems to not fit a specific case');
  //   }
  // }

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
    // So we make sure avoiding any compute is there is no event serie metadata modification, or a seat availability that has changed
    // (the latter would mean a ticket has been sold for example)
    const healthcheckResponse = await fetch(this.formatUrl(`/catalogService/v1_33/getPOSConfig`), {
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

    // TODO:
    // TODO:
    // TODO: if getting "sub audience category" (adult/youth...) only with tickets there is a risk
    // TODO: of missing pricing category name if no sale for a specific one... (but maybe there is no endpoint for this :/)
    // TODO:
    // TODO:
    // TODO:
    // TODO:
    // TODO: maybe getUpdatedAvailabilities if we can pass multiple ones, call it the first time before getCatalog
    // TODO: then after having all performances, call it to see if we can prevent returning specific eventSerie if no performance has changed
    // TODO: but hard to know if one has been removed since then... so better to recompute everything
    // TODO:
    // TODO:
    // TODO:
    // TODO: faut-il qu'un "event" ait un endDate nullable ? Pour coller à plusieurs ticketingSystem ?
    // TODO: bizarre sinon d'utiliser un placeholder "5h du matin après" si jamais y'avait des calculs statistiques derrière ?
    // TODO: (et même dans la UI...)... créer une issue dans le backlog ?
    // TODO:

    return [];
  }
}
