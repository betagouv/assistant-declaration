import { eachOfLimit } from 'async';
import { fromUnixTime, isAfter, isBefore } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
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
import {
  JsonGetEventResponseSchema,
  JsonListCheckingStatsResponseSchema,
  JsonListOrdersResponseSchema,
  JsonListOrganizationsResponseSchema,
  JsonListTypeTicketsResponseSchema,
  JsonLoginResponseSchema,
  JsonOrderSchemaType,
  JsonTypeTicketSchemaType,
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
      const error = await organizationsResponse.text();

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
        const error = await eventsResponse.text();

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
        const error = await recentlyUpdatedOrdersResponse.text();

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
      const eventResponse = await fetch(this.formatUrl(`/events/${eventId}`), {
        method: 'GET',
        headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
      });

      if (!eventResponse.ok) {
        const error = await eventResponse.text();

        throw error;
      }

      const eventDataJson = await eventResponse.json();
      const eventData = JsonGetEventResponseSchema.parse(eventDataJson);

      const startDate = fromUnixTime(eventData.results.begin);
      const endDate = fromUnixTime(eventData.results.end);

      schemaEvents.push(
        LiteEventSchema.parse({
          internalTicketingSystemId: eventData.results.id.toString(),
          startAt: startDate,
          endAt: endDate,
        })
      );

      // Retrieve ticket categories
      const typeTickets: JsonTypeTicketSchemaType[] = [];

      let typeTicketsCurrentPage: number = 1;

      // Note: there is still a risk of pagination shift but with a low probability for ticket categories
      while (true) {
        const typeTicketsResponse = await fetch(this.formatUrl(`/events/${eventId}/typetickets`), {
          method: 'GET',
          headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
          body: JSON.stringify({
            range: `${(typeTicketsCurrentPage - 1) * this.maximumItemsPerPage}-${typeTicketsCurrentPage * this.maximumItemsPerPage}`, // 0-30, 30-60... (one side of the range is excluding)
            orderBy: 'updated_at', // It will sort DESC
          }),
        });

        if (!typeTicketsResponse.ok) {
          const error = await typeTicketsResponse.text();

          throw error;
        }

        const typeTicketsDataJson = await typeTicketsResponse.json();
        const typeTicketsData = JsonListTypeTicketsResponseSchema.parse(typeTicketsDataJson);

        // Make sure our local maximum pagination logic is correct
        assert(this.maximumItemsPerPage === typeTicketsData.paging.nb_per_page);

        typeTickets.push(...typeTicketsData.results);

        // If we reached all recent orders until the `fromDate`, we can stop pagination
        if (!typeTicketsData.paging.cursors.next) {
          break;
        }

        typeTicketsCurrentPage++;
      }

      let taxRate: number | null = null;

      for (const typeTicket of typeTickets) {
        let ticketCategoryName = typeTicket.name;

        if (typeTicket.category) {
          ticketCategoryName = `${ticketCategoryName} - ${typeTicket.category.label}`;
        }

        const ticketCategory = LiteTicketCategorySchema.parse({
          internalTicketingSystemId: typeTicket.id.toString(),
          name: ticketCategoryName,
          description: null,
          price: typeTicket.amount,
        });

        schemaTicketCategories.set(ticketCategory.internalTicketingSystemId, ticketCategory);

        // Now since internally we manage a unique tax rate per event serie, we make sure all prices are using the same
        if (taxRate === null) {
          taxRate = typeTicket.vat_rate;
        } else if (taxRate !== typeTicket.vat_rate) {
          // throw new Error(`an event serie should have the same tax rate for all dates and prices`)

          // [WORKAROUND] Until we decide the right way to do, just keep a tax rate none null
          taxRate = Math.max(taxRate, typeTicket.vat_rate);
        }
      }

      // Here we get the sum of sold/given tickets for each ticket category
      // Notes:
      // - the endpoint `/events/$ID/checking/stats` has a delay, when testing validating a ticket we are not seeing it directly
      // through this endpoint. Maybe it's risky but we do not need realtime, but it would be great to know the delay of refresh
      // - the endpoint `/events/$ID/ticketing/stats` is similar
      // - the other solution would have been to use the `/events/$ID/tickets` endpoint but since the pagination limit is not that high
      // it would be more ressources intensive for their servers, so as of now taking the risk of "cold data"
      const checkingStatsResponse = await fetch(this.formatUrl(`/events/${eventId}/checking/stats`), {
        method: 'GET',
        headers: this.formatHeadersWithAuthToken(this.defaultHeaders, accessToken),
      });

      if (!checkingStatsResponse.ok) {
        const error = await checkingStatsResponse.text();

        throw error;
      }

      const checkingStatsDataJson = await checkingStatsResponse.json();
      const checkingStatsData = JsonListCheckingStatsResponseSchema.parse(checkingStatsDataJson);

      for (const ticketTypeStats of checkingStatsData.results) {
        const ticketCategory = schemaTicketCategories.get(ticketTypeStats.id.toString());

        assert(ticketCategory);

        const uniqueId = `${eventId}_${ticketCategory.internalTicketingSystemId}`;

        schemaEventSales.set(
          uniqueId,
          LiteEventSalesSchema.parse({
            internalEventTicketingSystemId: eventId.toString(),
            internalTicketCategoryTicketingSystemId: ticketCategory.internalTicketingSystemId,
            total: ticketTypeStats.total_ticket,
          })
        );
      }

      assert(taxRate !== null);

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: eventId.toString(),
          name: eventData.results.name,
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
