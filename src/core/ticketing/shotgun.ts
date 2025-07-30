import { eachOfLimit } from 'async';
import { addYears } from 'date-fns';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { shotgunTooMuchToRetrieveError } from '@ad/src/models/entities/errors';
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
  JsonEventSchemaType,
  JsonListEventsResponseSchema,
  JsonListTicketsResponseSchema,
  JsonTicketSchemaType,
} from '@ad/src/models/entities/shotgun';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { sleep } from '@ad/src/utils/sleep';

export class ShotgunTicketingSystemClient implements TicketingSystemClient {
  public baseUrl = 'https://smartboard-api.shotgun.live/api/shotgun';
  protected usingTestEnvironnement = false;
  protected oldTokenWorkaround: boolean = false;

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {
    // [WORKAROUND] For specific endpoints they added a new auth query parameter but only for recent tokens
    // so we have to guess the time they release this to use the right query parameter
    const decoded = jwt.decode(secretKey);

    if (decoded && typeof decoded === 'object' && decoded.iat && decoded.iat < 1751320800) {
      // Before first July 1st 2025
      this.oldTokenWorkaround = true;
    }
  }

  public useTestEnvironnement() {
    this.usingTestEnvironnement = true;
    this.baseUrl = 'https://smartboard-api-staging.shotgun.live/api/shotgun';
  }

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    url.search = new URLSearchParams({
      organizer_id: this.accessKey,
      ...(this.oldTokenWorkaround ? { token: this.secretKey } : { key: this.secretKey }),
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
          cursor: true.toString(), // Needed otherwise the pagination object does not match what we expect for this type of call
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
    // [WORKAROUND] With Shotgun we have to go through all tickets to compute totals on ticket categories
    // but we have some users woth 100k+ tickets over a year whereas Shotgun only allows a pagination of 50 items
    // So for now we have decided to error for those users (we have to get the pagination total, only gettable without a cursor-ed request)
    const workaroundResponse = await fetch(
      this.formatUrl(`/tickets/sold`, {
        after: fromDate.toISOString(),
        ...(toDate ? { before: toDate.toISOString() } : {}), // This is only used for tests to return a decent amount of data
      }),
      { method: 'GET' }
    );

    if (!workaroundResponse.ok) {
      const error = await workaroundResponse.text();

      throw error;
    }

    const workaroundTicketsDataJson = await workaroundResponse.json();

    const workaroundTicketsData = JsonListTicketsResponseSchema.extend({
      pagination: z.object({
        // Have to patch the object since not using the cursor pagination
        totalResults: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
      }),
    }).parse(workaroundTicketsDataJson);

    if (workaroundTicketsData.pagination.totalPages > 500) {
      throw shotgunTooMuchToRetrieveError;
    }

    // Get tickets modifications to know which events to synchronize (for the first time, or again)
    const recentlyUpdatedTickets: JsonTicketSchemaType[] = [];

    let recentlyUpdatedTicketsCurrentCursor: number | true = true; // To set the first page setting it empty or to true is fine

    // TODO: since the pagination is only 50 tickets per page, we could make a workaround for the first inialization
    // to consider all modified events during since the `fromDate`, it would save performance a bit...
    // We could also ask them to have a filter for events for "has modified ticket after date"
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

      // Wait a bit since due the tiny maximum "per page" we probably have to make more requests
      await sleep(50);
    }

    // Retrieve eligible event series
    const uniqueEventsIdsToSynchronize = [...new Set(recentlyUpdatedTickets.map((ticket) => ticket.event_id))];

    // Since there is no way to retrieve individually the wanted event series we have to browse the list to retrieve them
    // But we optimize this by stopping the pagination in case we found all of them sooner (they seem to be ordered by creation date DESC)
    const wantedEvents: JsonEventSchemaType[] = [];

    let eventsCurrentPage: number = 0; // For whatever reason on the events endpoint there is no cursor pagination, and it starts at page 0, not page 1
    const eventsPageLimit: number = 50; // We can set a high number but since ordered the right way it should not be necessary

    const remainingEventsIdsToRetrieve = [...uniqueEventsIdsToSynchronize];

    // It seems the Shotgun API does not allow to retrieve past and future events in the same request
    // So we have to repeat the pagination browsing twice either in the past and the future
    // Note: we set the future events first to avoid browsing all the past ones (since recent tickets are likely for current/future events)
    const pastEventsValues = [false, true];

    for (const pastEventsValue of pastEventsValues) {
      while (true) {
        // If we found all events we wanted we can stop the pagination
        if (remainingEventsIdsToRetrieve.length === 0) {
          break;
        }

        const eventsResponse = await fetch(
          this.formatUrl(`/organizers/${this.accessKey}/events`, {
            page: eventsCurrentPage.toString(),
            limit: eventsPageLimit.toString(),
            // Using `past_events=false` will still consider it as `true` so just making it optional
            ...(pastEventsValue === true ? { past_events: 'true' } : {}),
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

        // Wait a bit since due the tiny maximum "per page" we probably have to make more requests
        await sleep(50);
      }
    }

    // In case there is a switch between the pagination of future events and past ones
    // In staging we had the case where tickets were pointing to non-existing events...
    // That's maybe due to deleted events even if it's weird, so we cannot assume a count match
    // assert(wantedEvents.length === uniqueEventsIdsToSynchronize.length);

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(wantedEvents, 1, async (event) => {
      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      // It's important to note Shotgun is having only "1 event serie = 1 event" (there is no multiple representations for the same serie)
      // We could have tried to merged them based on naming but it's kind of tricky before knowing well their customer usage of it
      schemaEvents.push(
        LiteEventSchema.parse({
          internalTicketingSystemId: event.id.toString(),
          startAt: event.startTime,
          endAt: event.endTime,
        })
      );

      let taxRate: number | null = null;

      for (const deal of event.deals) {
        // The price to declare is the one without fees for the organization and user
        // Note: `deal.price` already excludes `deal.organizer_fees` and `deal.user_fees` (confirmed by their support)
        const price = deal.price;

        // It seems the subcategory is often used for `Cat. 1`...
        const ticketCategoryName = deal.subcategory ? `${deal.name} - ${deal.subcategory.name}` : deal.name;

        const ticketCategory = LiteTicketCategorySchema.parse({
          internalTicketingSystemId: deal.product_id.toString(),
          name: ticketCategoryName,
          description: deal.description,
          price: price,
        });

        schemaTicketCategories.set(ticketCategory.internalTicketingSystemId, ticketCategory);
      }

      const eventTickets: JsonTicketSchemaType[] = [];

      let eventTicketsCurrentCursor: number | true = true; // To set the first page setting it empty or to true is fine

      while (true) {
        const eventTicketsResponse = await fetch(
          this.formatUrl(`/tickets/sold`, {
            event_id: event.id.toString(),
            cursor: eventTicketsCurrentCursor.toString(), // Note: the limit of results cannot be customized with their new pagination system
          }),
          { method: 'GET' }
        );

        if (!eventTicketsResponse.ok) {
          const error = await eventTicketsResponse.text();

          throw error;
        }

        const eventTicketsDataJson = await eventTicketsResponse.json();

        const eventTicketsData = JsonListTicketsResponseSchema.parse(eventTicketsDataJson);

        eventTicketsData.data.forEach((ticket, ticketIndex) => {
          eventTickets.push(ticket);
        });

        if (!eventTicketsData.pagination.next) {
          break;
        }

        // Adjust to fetch the next page
        const newCursor = eventTickets[eventTickets.length - 1].ticket_id;

        assert(newCursor !== eventTicketsCurrentCursor);

        eventTicketsCurrentCursor = newCursor;

        // Wait a bit since due the tiny maximum "per page" we probably have to make more requests
        await sleep(50);
      }

      for (const ticket of eventTickets) {
        // Now since internally we manage a unique tax rate per event serie, we make sure all prices are using the same
        // [IMPORTANT] We gather this info before filtering by status, because the rare case of an event with no valid ticket (likely a future event)
        // we would have the tax rate as `null`, which we consider as an error
        if (taxRate === null) {
          taxRate = ticket.vat_rate;
        } else if (taxRate !== ticket.vat_rate) {
          // throw new Error(`an event serie should have the same tax rate for all dates and prices`)

          // [WORKAROUND] Until we decide the right way to do, just keep a tax rate none null
          taxRate = Math.max(taxRate, ticket.vat_rate);
        }

        // Note: `resold` means another ticket has been issued to replace this one, so skipping it too
        if (ticket.ticket_status !== 'valid') {
          continue;
        }

        const correspondingTicketCategory = schemaTicketCategories.get(ticket.product_id.toString());

        assert(correspondingTicketCategory);

        const eventId = event.id.toString();
        const ticketCategoryId = ticket.product_id.toString();
        const uniqueId = `${eventId}_${ticketCategoryId}`;
        const eventSales = schemaEventSales.get(uniqueId);

        if (!eventSales) {
          // We make sure the event has been properly retrieved
          const relatedEvent = schemaEvents.find((event) => event.internalTicketingSystemId === eventId);
          if (!relatedEvent) {
            throw new Error('a sold ticket should always match an existing event');
          }

          schemaEventSales.set(
            uniqueId,
            LiteEventSalesSchema.parse({
              internalEventTicketingSystemId: eventId,
              internalTicketCategoryTicketingSystemId: ticketCategoryId,
              total: 1,
            })
          );
        } else {
          eventSales.total += 1;
        }
      }

      assert(taxRate !== null);

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: event.id.toString(),
          name: event.name,
          startAt: event.startTime,
          endAt: event.endTime,
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
