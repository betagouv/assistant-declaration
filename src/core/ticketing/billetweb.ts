import { eachOfLimit } from 'async';
import { getUnixTime } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  JsonGetAttendeesResponseSchema,
  JsonGetEventAttendeesResponseSchema,
  JsonGetEventsOccurencesResponseSchema,
  JsonGetEventsResponseSchema,
  JsonGetEventsResponseSchemaType,
  JsonGetTicketCategoriesResponseSchema,
} from '@ad/src/models/entities/billetweb';
import { missingBilletwebEventsRightsError } from '@ad/src/models/entities/errors';
import {
  LiteEventSalesSchema,
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchema,
} from '@ad/src/models/entities/event';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class BilletwebTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://www.billetweb.fr/api';

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

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

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection
      const lastModifiedAttendeesResponse = await fetch(
        this.formatUrl(`/attendees`, {
          last_update: getUnixTime(new Date()).toString(),
        }),
        {
          method: 'GET',
        }
      );

      if (!lastModifiedAttendeesResponse.ok) {
        const error = await lastModifiedAttendeesResponse.json();

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
    const lastModifiedAttendeesResponse = await fetch(
      this.formatUrl(`/attendees`, {
        last_update: getUnixTime(fromDate).toString(), // Should be used to synchronize only from last complete synchronization
        ...(toDate ? { to: getUnixTime(toDate).toString() } : {}), // This is only used for tests to return a decent amount of data
      }),
      {
        method: 'GET',
      }
    );

    if (!lastModifiedAttendeesResponse.ok) {
      const error = await lastModifiedAttendeesResponse.json();

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
      const eventsResponse = await fetch(
        this.formatUrl(`/events`, {
          past: '1',
        }),
        {
          method: 'GET',
        }
      );

      if (!eventsResponse.ok) {
        const error = await eventsResponse.json();

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
      // TODO: unfortunately there is no endpoint to get an event alone, so to get name/description/startDate we have to reuse them from `/attendees`
      // endpoint to not fetch all events from the beginning... (missing endDate)

      const datesResponse = await fetch(
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
        const error = await datesResponse.json();

        throw error;
      }

      const datesDataJson = await datesResponse.json();
      const dates = JsonGetEventsOccurencesResponseSchema.parse(datesDataJson);

      // From the workaround we get the appropriate event entity
      const event = events.find((e) => e.id === eventId);

      assert(event);

      // Some really old events series have neither a start date nor an end date, their data is probably broken...
      // Since it's not for recent events we just avoid them
      if (event.start === null || event.end === null) {
        return;
      }

      // For this ticketing system, if an event has only 1 session it won't have any date in their backend, which is weird but we have to emulate it for our own logic

      // From what we saw it's always '0', but due to it's no longer unique across series so we add a prefix
      // Uniqueness is required for us to compare easily the differences
      const fallbackEventTicketingSystemId = `fallback_${event.id}_0`;

      let schemaEvents: LiteEventSchemaType[];
      if (event.multiple === false) {
        // We make sure of this logic to no miss something
        assert(dates.length === 0, `event ${event.id} is not multiple but has sessions`);

        schemaEvents = [
          LiteEventSchema.parse({
            internalTicketingSystemId: fallbackEventTicketingSystemId,
            startAt: event.start,
            endAt: event.end,
          }),
        ];
      } else {
        schemaEvents = dates.map((date) =>
          LiteEventSchema.parse({
            internalTicketingSystemId: date.id,
            startAt: date.start,
            endAt: date.end,
          })
        );
      }

      // [WARNING] Some live performance organizations are using those technical entries to sell either subscriptions, a series of performances, or gift tickets
      // We considered filtering them but we ended not finding a right solution:
      // - Those events has the same structure
      // - VAT can not be used to differenciate
      // - Having no place (`null`) cannot help becasue some subscriptions had the place
      // - Having a serie taking place over more than 11 months does not mean it's a subscription, it could also be a performance serie
      // - Having all attendees `session_start=""` is not viable because a real performance also has this if it's not yet started (not a strong indicator comparing with current date)
      //
      // At the end, we let them pass all, but will implement a way for users to ignore specific ones so the UI is clean

      const attendeesResponse = await fetch(
        this.formatUrl(`/event/${eventId}/attendees`, {
          // TODO: for now try not using it for simplicity
          // last_update: getUnixTime(fromDate).toString(), // Should be used to synchronize only from last complete synchronization
        }),
        {
          method: 'GET',
        }
      );

      if (!attendeesResponse.ok) {
        const error = await attendeesResponse.json();

        throw error;
      }

      const attendeesDataJson = await attendeesResponse.json();
      const attendees = JsonGetEventAttendeesResponseSchema.parse(attendeesDataJson);

      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();
      for (const attendee of attendees) {
        const orderSession = attendee.order_session === '0' ? fallbackEventTicketingSystemId : attendee.order_session;
        const uniqueId = `${orderSession}_${attendee.ticket_id}`;
        const eventSales = schemaEventSales.get(uniqueId);

        if (!eventSales) {
          // We make sure the event has been properly retrieved or emulated (since a serie may have no date associated but represents a single one implicitly)
          const relatedEvent = schemaEvents.find((event) => event.internalTicketingSystemId === orderSession);
          if (!relatedEvent) {
            throw new Error('a sold ticket should always match an existing event');
          }

          schemaEventSales.set(
            uniqueId,
            LiteEventSalesSchema.parse({
              internalEventTicketingSystemId: orderSession,
              internalTicketCategoryTicketingSystemId: attendee.ticket_id,
              total: 1,
            })
          );
        } else {
          eventSales.total += 1;
        }
      }

      const ticketCategoriesResponse = await fetch(this.formatUrl(`/event/${eventId}/tickets`, {}), {
        method: 'GET',
      });

      if (!ticketCategoriesResponse.ok) {
        const error = await ticketCategoriesResponse.json();

        throw error;
      }

      const ticketCategoriesDataJson = await ticketCategoriesResponse.json();
      const ticketCategories = JsonGetTicketCategoriesResponseSchema.parse(ticketCategoriesDataJson);

      const schemaTicketCategories = ticketCategories.map((ticketCategory) => {
        // The price includes the commission fee from the ticketing system
        // We do not need it for users to declare the right amounts
        const price = ticketCategory.commission !== false ? ticketCategory.price - ticketCategory.commission : ticketCategory.price;

        return LiteTicketCategorySchema.parse({
          internalTicketingSystemId: ticketCategory.id,
          name: ticketCategory.name,
          description: ticketCategory.description,
          price: price,
        });
      });

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: event.id,
          name: event.name,
          startAt: event.start,
          endAt: event.end,
          taxRate: event.tax_rate / 100,
        }),
        events: schemaEvents,
        ticketCategories: schemaTicketCategories,
        sales: Array.from(schemaEventSales.values()),
      });
    });

    return eventsSeriesWrappers;
  }
}
