import { eachOfLimit } from 'async';
import { getUnixTime, set } from 'date-fns';

import {
  JsonGetAttendeesResponseSchema,
  JsonGetEventAttendeesResponseSchema,
  JsonGetEventsOccurencesResponseSchema,
  JsonGetEventsResponseSchema,
  JsonGetEventsResponseSchemaType,
  JsonGetTicketCategoriesResponseSchema,
} from '@ad/src/models/entities/billetweb';
import {
  LiteEventSalesSchema,
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSerieSchema,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchema,
} from '@ad/src/models/entities/event';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { sleep } from '@ad/src/utils/sleep';

export interface TicketingSystemClient {
  getEventsSeries(fromDate: Date): Promise<LiteEventSerieWrapperSchemaType[]>;
}

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

      const schemaEvents = dates.map((date) =>
        LiteEventSchema.parse({
          internalTicketingSystemId: date.id,
          startAt: date.start,
          endAt: date.end,
        })
      );

      // Some live performance organizations are using those technical entries to sell either subscriptions, a series of performances, or gift tickets
      // So we consider not displaying them, and even if it was a real show, it would not been to declare since no dates for now
      if (schemaEvents.length === 0) {
        return;
      }

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
        const uniqueId = `${attendee.order_session}_${attendee.ticket_id}`;
        const eventSales = schemaEventSales.get(uniqueId);

        if (!eventSales) {
          schemaEventSales.set(
            uniqueId,
            LiteEventSalesSchema.parse({
              internalEventTicketingSystemId: attendee.order_session,
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

      // From the workaround we get the appropriate event entity
      const event = events.find((e) => e.id === eventId);

      assert(event);

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

export class MockTicketingSystemClient implements TicketingSystemClient {
  public async getEventsSeries(fromDate: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // Simulate loading
    await sleep(4000);

    // For now return always the same data to prove differences detection works
    return [
      {
        serie: {
          internalTicketingSystemId: 's1',
          name: 'Mon premier coucou',
          startAt: set(new Date(0), { year: 2024, month: 11, date: 18 }),
          endAt: set(new Date(0), { year: 2024, month: 11, date: 30 }),
          taxRate: 0.055,
        },
        events: [
          {
            internalTicketingSystemId: 'e1-1',
            startAt: set(new Date(0), { year: 2024, month: 11, date: 18 }),
            endAt: set(new Date(0), { year: 2024, month: 11, date: 19 }),
          },
        ],
        ticketCategories: [
          {
            internalTicketingSystemId: 't1-1',
            name: 'Place adulte',
            description: 'Suite à votre achat, vous recevrez par email votre place',
            price: 12,
          },
          {
            internalTicketingSystemId: 't1-2',
            name: 'Place enfant',
            description: 'Suite à votre achat, vous recevrez par email votre place',
            price: 6,
          },
        ],
        sales: [
          {
            internalEventTicketingSystemId: 'e1-1',
            internalTicketCategoryTicketingSystemId: 't1-1',
            total: 13,
          },
          {
            internalEventTicketingSystemId: 'e1-1',
            internalTicketCategoryTicketingSystemId: 't1-2',
            total: 23,
          },
        ],
      },
      {
        serie: {
          internalTicketingSystemId: 's2',
          name: 'Un coucou au soleil',
          startAt: set(new Date(0), { year: 2024, month: 12, date: 1 }),
          endAt: set(new Date(0), { year: 2024, month: 12, date: 20 }),
          taxRate: 0.055,
        },
        events: [
          {
            internalTicketingSystemId: 'e2-1',
            startAt: set(new Date(0), { year: 2024, month: 12, date: 1 }),
            endAt: set(new Date(0), { year: 2024, month: 12, date: 1 }),
          },
          {
            internalTicketingSystemId: 'e2-2',
            startAt: set(new Date(0), { year: 2024, month: 12, date: 19 }),
            endAt: set(new Date(0), { year: 2024, month: 12, date: 19 }),
          },
        ],
        ticketCategories: [
          {
            internalTicketingSystemId: 't2-1',
            name: 'Place adulte',
            description: null,
            price: 20,
          },
          {
            internalTicketingSystemId: 't2-2',
            name: 'Place enfant',
            description: null,
            price: 5,
          },
          {
            internalTicketingSystemId: 't2-3',
            name: 'Adhérent',
            description: 'Tarif réservé aux adhérents de la saison 2024/2025',
            price: 12,
          },
        ],
        sales: [
          {
            internalEventTicketingSystemId: 'e2-1',
            internalTicketCategoryTicketingSystemId: 't2-1',
            total: 40,
          },
          {
            internalEventTicketingSystemId: 'e2-1',
            internalTicketCategoryTicketingSystemId: 't2-2',
            total: 5,
          },
          {
            internalEventTicketingSystemId: 'e2-2',
            internalTicketCategoryTicketingSystemId: 't2-1',
            total: 30,
          },
          {
            internalEventTicketingSystemId: 'e2-2',
            internalTicketCategoryTicketingSystemId: 't2-3',
            total: 5,
          },
          {
            internalEventTicketingSystemId: 'e2-2',
            internalTicketCategoryTicketingSystemId: 't2-2',
            total: 3,
          },
        ],
      },
    ];
  }
}
