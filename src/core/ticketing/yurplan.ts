import { eachOfLimit } from 'async';
import { fromUnixTime, isAfter, isBefore } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import {
  JsonListOrdersResponseSchema,
  JsonListOrganizationsResponseSchema,
  JsonLoginResponseSchema,
  JsonOrderSchemaType,
} from '@ad/src/models/entities/yurplan';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class YurplanTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://api.yurplan.com/v1/token';
  public readonly maximumItemsPerPage = 30;
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
          range: `0-${this.maximumItemsPerPage}`,
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
    // Note: there is still a risk of pagination shift...
    while (true) {
      const recentlyUpdatedOrdersResponse = await fetch(this.formatUrl(`/orgas/${organizationId}/recentlyUpdatedOrders`), {
        method: 'GET',
        headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
        body: JSON.stringify({
          range: `${(recentlyUpdatedOrdersCurrentPage - 1) * this.maximumItemsPerPage}-${
            recentlyUpdatedOrdersCurrentPage * this.maximumItemsPerPage
          }`, // 0-30, 30-60... (one side of the range is excluding)
          orderBy: 'updated_at', // It will sort DESC (so we can stop when we reach the `fromDate`)
        }),
      });

      if (!recentlyUpdatedOrdersResponse.ok) {
        const error = await recentlyUpdatedOrdersResponse.json();

        throw error;
      }

      const recentlyUpdatedOrdersDataJson = await recentlyUpdatedOrdersResponse.json();
      const recentlyUpdatedOrdersData = JsonListOrdersResponseSchema.parse(recentlyUpdatedOrdersDataJson);

      // Make sure our local maximum pagination logic is correct
      assert(this.maximumItemsPerPage === recentlyUpdatedOrdersData.paging.nb_per_page);

      let pageOrdersInAfterFromDate = 0;
      recentlyUpdatedOrdersData.results.forEach((order) => {
        if (isAfter(fromUnixTime(order.updated_at), fromDate)) {
          recentlyUpdatedOrders.push(order);
          pageOrdersInAfterFromDate++;
        }
      });

      // If we reached all recent orders until the `fromDate`, we can stop pagination
      if (recentlyUpdatedOrdersData.results.length !== pageOrdersInAfterFromDate) {
        break;
      } else if (!recentlyUpdatedOrdersData.paging.cursors.next) {
        break;
      }

      recentlyUpdatedOrdersCurrentPage++;
    }

    // Since there is no API "before" filter we simulate it to be consistent across tests (despite getting more data over time)
    const orders = toDate ? recentlyUpdatedOrders.filter((order) => isBefore(fromUnixTime(order.updated_at), toDate)) : recentlyUpdatedOrders;

    // Retrieve eligible events
    const uniqueEventsIds = [...new Set(orders.map((order) => order.event.id))];

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(uniqueEventsIds, 1, async (eventId) => {
      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      // It's important to note Yurplan is having only "1 event serie = 1 event" (there is no multiple representations for the same serie)
      // We could have tried to merged them based on naming but it's kind of tricky before knowing well their customer usage of it

      // TODO:
      // TODO:
      // TODO: get event
      // TODO: get event typetickets (categories)
      // TODO: get event /checking/stats
      // TODO: done...
      // TODO:
      // TODO:

      schemaEvents.push(
        LiteEventSchema.parse({
          internalTicketingSystemId: event.id.toString(),
          startAt: event.startTime,
          endAt: event.endTime,
        })
      );

      let taxRate: number | null = null;
    });

    return eventsSeriesWrappers;
  }
}
