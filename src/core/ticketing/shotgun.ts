import { eachOfLimit } from 'async';
import { addYears } from 'date-fns';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { getExcludingTaxesAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { shotgunTooMuchToRetrieveError } from '@ad/src/models/entities/errors';
import { LiteEventSchema, LiteEventSerieSchema, LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
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
      // It's important to note Shotgun is having only "1 event serie = 1 event" (there is no multiple representations for the same serie)
      // We could have tried to merged them based on naming but it's kind of tricky before knowing well their customer usage of it
      const schemaEvent = LiteEventSchema.parse({
        internalTicketingSystemId: event.id.toString(),
        startAt: event.startTime,
        endAt: event.endTime,
        ticketingRevenueIncludingTaxes: 0,
        ticketingRevenueExcludingTaxes: 0,
        ticketingRevenueTaxRate: null, // May be patched by going through all tickets
        freeTickets: 0,
        paidTickets: 0,
      });

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

      let indicativeTaxRate: number | null = null;

      // Note: a ticket category being free may have a 0% tax rate instead of being aligned with others, to take into account this case
      // it's easier having them at the end (because if only free categories, the tax rate should be 0, not null)
      const ticketsSortedWithDescendingTaxRates = eventTickets.sort((a, b) => +b.vat_rate - +a.vat_rate);

      for (const ticket of ticketsSortedWithDescendingTaxRates) {
        let ticketVatRate = ticket.vat_rate;

        if (indicativeTaxRate !== null) {
          // See comment about sorting tickets to understand why alignin tax rates when price is 0
          if (ticket.ticket_price === 0 && ticketVatRate === 0) {
            ticketVatRate = indicativeTaxRate;
          }

          // If the event mixes multiple tax rates set it to null since we are not managing this
          // Unfortunately it will cause the excluding taxes total being wrong but we are fine letting the end user correcting this
          if (indicativeTaxRate !== ticketVatRate) {
            indicativeTaxRate = null;

            break;
          }
        }

        indicativeTaxRate = ticketVatRate;
      }

      schemaEvent.ticketingRevenueTaxRate = indicativeTaxRate;

      for (const ticket of eventTickets) {
        const ticketVatRate = ticket.vat_rate;

        // Note: `resold` means another ticket has been issued to replace this one, so skipping it too
        if (ticket.ticket_status !== 'valid') {
          continue;
        }

        // The price to declare is the one without fees for the organization and user
        // Note: `ticket_price` already excludes `organizer_fees` and `user_fees` (confirmed by their support)
        const ticketPriceIncludingTaxes = ticket.ticket_price;

        if (ticketPriceIncludingTaxes === 0) {
          schemaEvent.freeTickets++;
        } else {
          schemaEvent.paidTickets++;
          schemaEvent.ticketingRevenueIncludingTaxes += ticketPriceIncludingTaxes;
          schemaEvent.ticketingRevenueExcludingTaxes += getExcludingTaxesAmountFromIncludingTaxesAmount(ticketPriceIncludingTaxes, ticketVatRate);
        }
      }

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: event.id.toString(),
          name: event.name,
        }),
        events: [schemaEvent],
      });
    });

    return eventsSeriesWrappers;
  }
}
