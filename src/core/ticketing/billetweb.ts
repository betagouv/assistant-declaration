import { eachOfLimit } from 'async';
import Bottleneck from 'bottleneck';
import { getUnixTime, minutesToMilliseconds } from 'date-fns';

import { getExcludingTaxesAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  JsonGetAttendeesResponseSchema,
  JsonGetEventAttendeesResponseSchema,
  JsonGetEventsOccurencesResponseSchema,
  JsonGetEventsResponseSchema,
  JsonGetEventsResponseSchemaType,
  JsonGetTicketCategoriesResponseSchema,
} from '@ad/src/models/entities/billetweb';
import { billetwebFirewallError, missingBilletwebEventsRightsError } from '@ad/src/models/entities/errors';
import { LiteEventSchema, LiteEventSchemaType, LiteEventSerieSchema, LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { sleep } from '@ad/src/utils/sleep';

export class BilletwebTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://www.billetweb.fr/api';
  protected requestsPerMinuteLimit = 90; // It's 100 according to our tests but using a margin just in case, still it's failing sometimes, maybe they reset the count not 60 seconds after the first request, but at each clock tick (each minute)
  protected requestsLimiter: Bottleneck = new Bottleneck({
    reservoir: this.requestsPerMinuteLimit,
    reservoirRefreshAmount: this.requestsPerMinuteLimit,
    reservoirRefreshInterval: minutesToMilliseconds(1),
  });

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  protected async rateLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return await this.requestsLimiter.schedule(() => fetch(input, init));
  }

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    url.search = new URLSearchParams({
      user: this.accessKey,
      key: this.secretKey,
      version: '1',
      ...params,
    }).toString();

    return url.toString();
  }

  protected assertErrorResponseIsNotFirewall(content: string): void {
    // It returns a page needing JavaScript that uses a relative script from Cloudflare
    // (pointing to https://www.billetweb.fr/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1)
    if (content.includes('cdn-cgi/challenge-platform')) {
      throw billetwebFirewallError;
    } else if (content.includes(`"error": "rate_limiting",`)) {
      // We avoid the JSON parsing logic here, but the response would be:
      // {
      //     "error": "rate_limiting",
      //     "description": "You exceed the global rate limiter : 100 hits per minute"
      // }
      throw billetwebFirewallError;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection
      const lastModifiedAttendeesResponse = await this.rateLimitedFetch(
        this.formatUrl(`/attendees`, {
          last_update: getUnixTime(new Date()).toString(),
        }),
        {
          method: 'GET',
        }
      );

      if (!lastModifiedAttendeesResponse.ok) {
        const error = await lastModifiedAttendeesResponse.text();

        this.assertErrorResponseIsNotFirewall(error);

        throw error;
      }

      const lastModifiedAttendeesDataJson = await lastModifiedAttendeesResponse.json();

      if (
        lastModifiedAttendeesDataJson.error === 'unauthorized' &&
        lastModifiedAttendeesDataJson.description?.includes('limited rights to specific events')
      ) {
        throw missingBilletwebEventsRightsError;
      }

      JsonGetAttendeesResponseSchema.parse(lastModifiedAttendeesDataJson);

      return true;
    } catch (error) {
      // Specific errors may be useful for the frontend, so letting them pass
      if (error === missingBilletwebEventsRightsError) {
        throw error;
      } else {
        return false;
      }
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // Get attendees modifications to know which events to synchronize (for the first time, or again)
    const lastModifiedAttendeesResponse = await this.rateLimitedFetch(
      this.formatUrl(`/attendees`, {
        last_update: getUnixTime(fromDate).toString(), // Should be used to synchronize only from last complete synchronization
        ...(toDate ? { to: getUnixTime(toDate).toString() } : {}), // This is only used for tests to return a decent amount of data
      }),
      {
        method: 'GET',
      }
    );

    if (!lastModifiedAttendeesResponse.ok) {
      const error = await lastModifiedAttendeesResponse.text();

      this.assertErrorResponseIsNotFirewall(error);

      throw error;
    }

    const lastModifiedAttendeesDataJson = await lastModifiedAttendeesResponse.json();

    if (
      lastModifiedAttendeesDataJson.error === 'unauthorized' &&
      lastModifiedAttendeesDataJson.description?.includes('limited rights to specific events')
    ) {
      throw missingBilletwebEventsRightsError;
    }

    const lastModifiedAttendees = JsonGetAttendeesResponseSchema.parse(lastModifiedAttendeesDataJson);

    const eventsIdsToSynchronize: string[] = [...new Set(lastModifiedAttendees.map((attendee) => attendee.event))];

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // [WORKAROUND] Since for now there is no endpoint to get only specific events we fetch them all
    // since our first users should not have many many events
    let events: JsonGetEventsResponseSchemaType;
    if (eventsIdsToSynchronize.length > 0) {
      const eventsResponse = await this.rateLimitedFetch(
        this.formatUrl(`/events`, {
          past: '1',
        }),
        {
          method: 'GET',
        }
      );

      if (!eventsResponse.ok) {
        const error = await eventsResponse.text();

        this.assertErrorResponseIsNotFirewall(error);

        throw error;
      }

      const eventsDataJson = await eventsResponse.json();
      events = JsonGetEventsResponseSchema.parse(eventsDataJson);
    } else {
      events = [];
    }

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(eventsIdsToSynchronize, 1, async (eventId) => {
      // Wait a bit since for an organization it was triggering their Cloudflare captcha
      await sleep(250);

      const datesResponse = await this.rateLimitedFetch(
        this.formatUrl(`/event/${eventId}/dates`, {
          past: '1',
          // TODO: for now try not using it for simplicity
          // last_update: getUnixTime(fromDate).toString(), // Should be used to synchronize only from last complete synchronization
        }),
        {
          method: 'GET',
        }
      );

      if (!datesResponse.ok) {
        const error = await datesResponse.text();

        this.assertErrorResponseIsNotFirewall(error);

        throw error;
      }

      const datesDataJson = await datesResponse.json();
      const dates = JsonGetEventsOccurencesResponseSchema.parse(datesDataJson);

      // From the workaround we get the appropriate event entity
      const event = events.find((e) => e.id === eventId);

      assert(event);

      // [WARNING] Some live performance organizations are using those technical entries to sell either subscriptions, a series of performances, or gift tickets
      // We considered filtering them but we ended not finding a right solution:
      // - Those events has the same structure
      // - VAT can not be used to differenciate
      // - Having no place (`null`) cannot help becasue some subscriptions had the place
      // - Having a serie taking place over more than 11 months does not mean it's a subscription, it could also be a performance serie
      // - Having all attendees `session_start=""` is not viable because a real performance also has this if it's not yet started (not a strong indicator comparing with current date)
      //
      // At the end, we let them pass all, but will implement a way for users to ignore specific ones so the UI is clean

      // Some really old events series have neither a start date nor an end date, their data is probably broken...
      // Since it's not for recent events we just avoid them
      if (event.start === null || event.end === null) {
        return;
      }

      // For this ticketing system, if an event has only 1 session it won't have any date in their backend, which is weird but we have to emulate it for our own logic

      // From what we saw it's always '0', but due to it's no longer unique across series so we add a prefix
      // Uniqueness is required for us to compare easily the differences
      const fallbackEventTicketingSystemId = `fallback_${event.id}_0`;

      // That's an indication for the event but technically each ticket category may have its own so the calculation of excluding taxes will go through all tickets
      const indicativeTaxRate = event.tax_rate / 100;

      const schemaEvents: Map<LiteEventSchemaType['internalTicketingSystemId'], LiteEventSchemaType> = new Map();
      if (event.multiple === false) {
        // We make sure of this logic to no miss something
        assert(dates.length === 0, `event ${event.id} is not multiple but has sessions`);

        schemaEvents.set(
          fallbackEventTicketingSystemId,
          LiteEventSchema.parse({
            internalTicketingSystemId: fallbackEventTicketingSystemId,
            startAt: event.start,
            endAt: event.end,
            ticketingRevenueIncludingTaxes: 0,
            ticketingRevenueExcludingTaxes: 0,
            ticketingRevenueTaxRate: indicativeTaxRate,
            freeTickets: 0,
            paidTickets: 0,
          })
        );
      } else {
        dates.forEach((date) => {
          schemaEvents.set(
            date.id,
            LiteEventSchema.parse({
              internalTicketingSystemId: date.id,
              startAt: date.start,
              endAt: date.end,
              ticketingRevenueIncludingTaxes: 0,
              ticketingRevenueExcludingTaxes: 0,
              ticketingRevenueTaxRate: indicativeTaxRate,
              freeTickets: 0,
              paidTickets: 0,
            })
          );
        });
      }

      const ticketCategoriesResponse = await this.rateLimitedFetch(this.formatUrl(`/event/${eventId}/tickets`, {}), {
        method: 'GET',
      });

      if (!ticketCategoriesResponse.ok) {
        const error = await ticketCategoriesResponse.text();

        this.assertErrorResponseIsNotFirewall(error);

        throw error;
      }

      const ticketCategoriesDataJson = await ticketCategoriesResponse.json();
      const ticketCategories = JsonGetTicketCategoriesResponseSchema.parse(ticketCategoriesDataJson);

      const ticketCategoryIdToCommissionAndTaxRate = new Map<
        string,
        {
          taxRate: number;
          commission: number;
        }
      >();
      ticketCategories.forEach((ticketCategory) =>
        ticketCategoryIdToCommissionAndTaxRate.set(ticketCategory.id, {
          taxRate: (ticketCategory.tax ?? event.tax_rate) / 100, // According to the Billetweb documentation, if filled it overrides the one from the event layer
          commission: ticketCategory.commission === false ? 0 : ticketCategory.commission,
        })
      );

      const attendeesResponse = await this.rateLimitedFetch(
        this.formatUrl(`/event/${eventId}/attendees`, {
          // TODO: for now try not using it for simplicity
          // last_update: getUnixTime(fromDate).toString(), // Should be used to synchronize only from last complete synchronization
        }),
        {
          method: 'GET',
        }
      );

      if (!attendeesResponse.ok) {
        const error = await attendeesResponse.text();

        this.assertErrorResponseIsNotFirewall(error);

        throw error;
      }

      const attendeesDataJson = await attendeesResponse.json();
      const attendees = JsonGetEventAttendeesResponseSchema.parse(attendeesDataJson);

      for (const attendee of attendees) {
        // If the ticket is marked as refunded we do not count it in the total
        if (attendee.disabled) {
          continue;
        }

        const orderSession = attendee.order_session === '0' ? fallbackEventTicketingSystemId : attendee.order_session;
        const relatedEvent = schemaEvents.get(orderSession);

        // We make sure the event has been properly retrieved or emulated (since a serie may have no date associated but represents a single one implicitly)
        if (!relatedEvent) {
          throw new Error('a sold ticket should always match an existing event');
        }

        const relatedTicketCategory = ticketCategoryIdToCommissionAndTaxRate.get(attendee.ticket_id);
        if (!relatedTicketCategory) {
          throw new Error('a sold ticket should always match a ticket category');
        }

        // Commission must be deduced when declaring from our platform
        // Note: if for whatever reason the buyer bad a 100% voucher code, we assume commission would not be applied entierly
        // TODO: this should be check... if ticket sold "40 cents" with voucher, and the category commission is "50 cents", do they reduce commission or not?
        const ticketPriceIncludingTaxes = Math.max(attendee.price - relatedTicketCategory.commission, 0);

        if (ticketPriceIncludingTaxes === 0) {
          relatedEvent.freeTickets++;
        } else {
          relatedEvent.paidTickets++;
          relatedEvent.ticketingRevenueIncludingTaxes += ticketPriceIncludingTaxes;
          relatedEvent.ticketingRevenueExcludingTaxes += getExcludingTaxesAmountFromIncludingTaxesAmount(
            ticketPriceIncludingTaxes,
            relatedTicketCategory.taxRate
          );
        }
      }

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: event.id,
          name: event.name,
        }),
        events: Array.from(schemaEvents.values()),
      });
    });

    return eventsSeriesWrappers;
  }
}
