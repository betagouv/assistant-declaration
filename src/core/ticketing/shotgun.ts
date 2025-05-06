import { eachOfLimit } from 'async';
import { addYears } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  LiteEventSalesSchemaType,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import {
  JsonEventSchemaType,
  JsonListEventsResponseSchema,
  JsonListTicketsResponseSchema,
  JsonTicketSchemaType,
} from '@ad/src/models/entities/shotgun';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class ShotgunTicketingSystemClient implements TicketingSystemClient {
  public baseUrl = 'https://smartboard-api.shotgun.live/api/shotgun';
  protected usingTestEnvironnement = false;

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  public useTestEnvironnement() {
    this.usingTestEnvironnement = true;
    this.baseUrl = 'https://smartboard-api-staging.shotgun.live/api/shotgun';
  }

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    url.search = new URLSearchParams({
      organizer_id: this.accessKey,
      token: this.secretKey,
      ...params,
    }).toString();

    return url.toString();
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection, so using a period range that would return no statement
      const futureDate = addYears(new Date(), 2);

      const soldTicketsResponse = await fetch(
        this.formatUrl(`/tickets/sold`, {
          after: futureDate.toISOString(),
          before: futureDate.toISOString(),
        }),
        { method: 'GET' }
      );

      if (!soldTicketsResponse.ok) {
        const error = await soldTicketsResponse.json();

        throw error;
      }

      const soldTicketsDataJson = await soldTicketsResponse.json();

      const soldTicketsData = JsonListTicketsResponseSchema.parse(soldTicketsDataJson);

      return true;
    } catch (error) {
      // [IMPORTANT] Sometimes having "Bearer token expired\/invalid" means for this specific Supersoniks customer the firewall is complaining
      // If the IP has been correctly authorized, forcing IPv4 would do the trick but there is no easy way
      // on the generated client we can configure (like Agent/Dispatcher), so it's better to rely only on a more abstract way by using:
      // `NODE_OPTIONS=--dns-result-order=ipv4first`
      // Note: it should not be an issue on our provider since it also manage IPv4 for know, this trick is only for specific debugs locally
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // Get tickets modifications to know which events to synchronize (for the first time, or again)
    const recentlyUpdatedTickets: JsonTicketSchemaType[] = [];

    let recentlyUpdatedTicketsCurrentCursor: number | true = true; // To set the first page setting it empty or to true is fine

    while (true) {
      const recentlyUpdatedTicketsResponse = await fetch(
        this.formatUrl(`/tickets/sold`, {
          after: fromDate.toISOString(),
          ...(toDate ? { before: toDate.toISOString() } : {}), // This is only used for tests to return a decent amount of data
          cursor: recentlyUpdatedTicketsCurrentCursor.toString(), // Note: the limit of results cannot be customized with their new pagination system
        }),
        { method: 'GET' }
      );

      if (!recentlyUpdatedTicketsResponse.ok) {
        const error = await recentlyUpdatedTicketsResponse.text();

        throw error;
      }

      const recentlyUpdatedTicketsDataJson = await recentlyUpdatedTicketsResponse.json();

      const recentlyUpdatedTicketsData = JsonListTicketsResponseSchema.parse(recentlyUpdatedTicketsDataJson);

      recentlyUpdatedTicketsData.data.forEach((ticket, ticketIndex) => {
        recentlyUpdatedTickets.push(ticket);
      });

      if (!recentlyUpdatedTicketsData.pagination.next) {
        break;
      }

      // Adjust to fetch the next page
      const newCursor = recentlyUpdatedTickets[recentlyUpdatedTickets.length - 1].ticket_id;

      assert(newCursor !== recentlyUpdatedTicketsCurrentCursor);

      recentlyUpdatedTicketsCurrentCursor = newCursor;
    }

    // Retrieve eligible event series
    const uniqueEventsIdsToSynchronize = [...new Set(recentlyUpdatedTickets.map((ticket) => ticket.event_id))];

    // Since there is no way to retrieve individually the wanted event series we have to browse the list to retrieve them
    // But we optimize this by stopping the pagination in case we found all of them sooner (they seem to be ordered by creation date DESC)
    const wantedEvents: JsonEventSchemaType[] = [];

    let eventsCurrentPage: number = 1; // For whatever reason on the events endpoint there is no cursor pagination
    const eventsPageLimit: number = 50; // We can set a high number but since ordered the right way it should not be necessary

    const remainingEventsIdsToRetrieve = [...uniqueEventsIdsToSynchronize];

    while (true) {
      // If we found all events we wanted we can stop the pagination
      if (remainingEventsIdsToRetrieve.length === 0) {
        break;
      }

      const eventsResponse = await fetch(
        this.formatUrl(`/organizers/${this.accessKey}/events`, {
          past_events: 'true',
          page: eventsCurrentPage.toString(),
          limit: eventsPageLimit.toString(),
        }),
        { method: 'GET' }
      );

      if (!eventsResponse.ok) {
        const error = await eventsResponse.text();

        throw error;
      }

      const eventsDataJson = await eventsResponse.json();

      const eventsData = JsonListEventsResponseSchema.parse(eventsDataJson);

      eventsData.data.forEach((event) => {
        const itemIndex = remainingEventsIdsToRetrieve.indexOf(event.id);

        if (itemIndex !== -1) {
          wantedEvents.push(event);

          remainingEventsIdsToRetrieve.splice(itemIndex, 1);
        }
      });

      // If less than the limit it's the end of the pagination
      if (eventsData.data.length < eventsPageLimit) {
        break;
      }

      eventsCurrentPage++;
    }

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(wantedEvents, 1, async (event) => {
      // It's important to note Shotgun is having only "1 event serie = 1 event" (there is no multiple representations for the same serie)
      // We could have tried to merged them based on naming but it's kind of tricky before knowing well their customers

      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      let taxRate: number | null = null;

      //
      //
      //
      //
      // TODO: maybe use old pagination for tickets... at least for recent tickets to fetch a lot at once...
      //
      //

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: spectacle.id_spectacle.toString(),
          name: spectacle.name,
          startAt: serieStartDate,
          endAt: serieEndDate,
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
