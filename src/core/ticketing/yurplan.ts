import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonListOrganizationsResponseSchema, JsonLoginResponseSchema } from '@ad/src/models/entities/yurplan';

export class YurplanTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://api.yurplan.com/v1/token';
  public readonly itemsPerPage = 30;
  protected readonly defaultHeaders = new Headers({
    'Content-Type': 'application/json',
  });

  constructor(
    private readonly partnerClientId: string,
    private readonly partnerClientSecret: string,
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    url.search = new URLSearchParams({
      ...params,
    }).toString();

    return url.toString();
  }

  public formatHeadersWithAuthToken(inputHeaders: Headers, accessToken: string): Headers {
    const headers = new Headers(inputHeaders);
    headers.set('Authorization', `Bearer ${accessToken}`);

    return headers;
  }

  public async login(): Promise<{ accessToken: string; organizationId: number }> {
    const formData = new FormData();
    formData.append('client_id', this.partnerClientId);
    formData.append('client_secret', this.partnerClientSecret);
    formData.append('grant_type', 'password');
    formData.append('username', this.accessKey);
    formData.append('password', this.secretKey);
    formData.append('scope', 'pro');

    const loginResponse = await fetch(this.formatUrl(`/token`, {}), { method: 'POST', body: formData });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();

      throw error;
    }

    const loginDataJson = await loginResponse.json();
    const loginData = JsonLoginResponseSchema.parse(loginDataJson);
    const accessToken = loginData.results.access_token;

    const organizationsResponse = await fetch(this.formatUrl(`/me/orgas`), {
      method: 'GET',
      headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
      body: JSON.stringify({
        range: `0-2`, // Just looking if more than 1 organization
      }),
    });

    if (!organizationsResponse.ok) {
      const error = await organizationsResponse.json();

      throw error;
    }

    const organizationsDataJson = await organizationsResponse.json();
    const organizationsData = JsonListOrganizationsResponseSchema.parse(organizationsDataJson);

    if (organizationsData.results.length !== 1) {
      throw new Error(`the credentials passed should be linked to only one organization (${organizationsData.results.length} in this case)`);
    }

    return { accessToken: accessToken, organizationId: organizationsData.results[0].id };
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection
      const { accessToken, organizationId } = await this.login();

      const eventsResponse = await fetch(this.formatUrl(`/orgas/${organizationId}/events`), {
        method: 'GET',
        headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
        body: JSON.stringify({
          range: `0-${this.itemsPerPage}`,
        }),
      });

      if (!eventsResponse.ok) {
        const error = await eventsResponse.json();

        throw error;
      }

      const eventsDataJson = await eventsResponse.json();
      const eventsData = JsonListOrganizationsResponseSchema.parse(eventsDataJson);

      return true;
    } catch (error) {
      throw error;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const { accessToken, organizationId } = await this.login();

    // Get tickets modifications to know which events to synchronize (for the first time, or again)
    const recentlyUpdatedOrders: JsonOrderSchemaType[] = [];

    let recentlyUpdatedOrdersCurrentPage: number = 1;

    // TODO: since the pagination is only 30 tickets per page, we could make a workaround for the first inialization
    // to consider all modified events during since the `fromDate`, it would save performance a bit...
    // We could also ask them to have a filter for events for "has modified ticket after date"
    while (true) {
      // Get tickets modifications to know which events to synchronize (for the first time, or again)
      const ordersResponse = await fetch(this.formatUrl(`/orgas/${organizationId}/orders`), {
        method: 'GET',
        headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
        body: JSON.stringify({
          range: `0-${this.itemsPerPage}`,
          orderBy: 'updated_at', // It will sort DESC (so we can stop when we reach the `fromDate`)
        }),
      });

      if (!ordersResponse.ok) {
        const error = await ordersResponse.json();

        throw error;
      }

      const ordersDataJson = await ordersResponse.json();
      const ordersData = JsonListOrganizationsResponseSchema.parse(ordersDataJson);
    }

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    return eventsSeriesWrappers;
  }
}
