import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { eachOfLimit } from 'async';
import { getUnixTime, isAfter, isBefore, set } from 'date-fns';

import { getEventDateCollection, getTicketCollection, getTicketingCollection } from '@ad/src/client/mapado';
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
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import {
  JsonCollectionSchemaType,
  JsonGetEventDatesResponseSchema,
  JsonGetRecentTicketsResponseSchema,
  JsonGetTicketingsResponseSchema,
  JsonGetTicketsResponseSchema,
  JsonTicketingSchemaType,
} from '@ad/src/models/entities/mapado';
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

export class MapadoTicketingSystemClient implements TicketingSystemClient {
  protected readonly client: Client;
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;

  constructor(secretKey: string) {
    this.client = createClient(
      createConfig({
        baseUrl: 'https://ticketing.mapado.net/',
        auth: secretKey,
      })
    );
  }

  protected assertCollectionResponseValid(data: JsonCollectionSchemaType) {
    if (!(typeof data['hydra:totalItems'] === 'number' && data['hydra:totalItems'] <= this.itemsPerPageToAvoidPagination)) {
      throw new Error('our workaround to avoid handling pagination logic seems to not fit a specific case');
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // Get tickets modifications to know which events to synchronize (for the first time, or again)
    const recentlyUpdatedTicketsResult = await getTicketCollection({
      client: this.client,
      query: {
        user: 'me',
        updatedSince: fromDate.toISOString(),
        itemsPerPage: this.itemsPerPageToAvoidPagination,
        ...{ fields: 'eventDate{ticketing},updatedAt' },
      },
    });

    if (recentlyUpdatedTicketsResult.error) {
      throw recentlyUpdatedTicketsResult.error;
    }

    const recentlyUpdatedTicketsData = JsonGetRecentTicketsResponseSchema.parse(recentlyUpdatedTicketsResult.data);

    this.assertCollectionResponseValid(recentlyUpdatedTicketsData);

    // Since there is no API `before` we simulate it to be consistent across tests (despite getting more data over time)
    const tickets = toDate
      ? recentlyUpdatedTicketsData['hydra:member'].filter((ticket) => isBefore(ticket.updatedAt, toDate))
      : recentlyUpdatedTicketsData['hydra:member'];

    // We did not get ticketings as associations in the previous call otherwise it would return a lot of copies
    const ticketingIdsToSynchronize: string[] = [
      ...new Set(
        tickets.map((ticket) => {
          return ticket.eventDate.ticketing;
        })
      ),
    ];

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    let ticketingsToSynchronize: JsonTicketingSchemaType[];
    if (ticketingIdsToSynchronize.length > 0) {
      const ticketingsResult = await getTicketingCollection({
        client: this.client,
        query: {
          '@id': ticketingIdsToSynchronize.join(','),
          itemsPerPage: this.itemsPerPageToAvoidPagination,
          ...{ fields: 'type,title,eventDateList,currency' },
        },
      });

      if (ticketingsResult.error) {
        throw ticketingsResult.error;
      }

      const ticketingsData = JsonGetTicketingsResponseSchema.parse(ticketingsResult.data);

      this.assertCollectionResponseValid(ticketingsData);

      ticketingsToSynchronize = ticketingsData['hydra:member'];
    } else {
      ticketingsToSynchronize = [];
    }

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(ticketingsToSynchronize, 1, async (ticketing) => {
      // Mapado allows creating "ticketings" that are not directly linked to a live performance
      // Like a subscription, a "free solidarity ticket", an offer... So we skip those since not appropriate for us
      if (ticketing.type !== 'dated_events') {
        return;
      }

      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: LiteTicketCategorySchemaType[] = [];
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      let taxRate: number | null = null;

      if (ticketing.eventDateList.length > 0) {
        // Thanks to associations we can retrieve "price category"
        // Note: it won't have duplicate entries since `TicketPrice` entity is unique per event (it causes us complications below to aggregate them due to our internal structure)
        const eventDatesResult = await getEventDateCollection({
          client: this.client,
          query: {
            '@id': ticketing.eventDateList.join(','),
            itemsPerPage: this.itemsPerPageToAvoidPagination,
            ...{
              fields:
                '@id,startDate,endDate,startOfEventDay,endOfEventDay,ticketPriceList{id,type,name,description,currency,facialValue,tax{rate,countryCode},valueIncvat}',
            },
          },
        });

        if (eventDatesResult.error) {
          throw eventDatesResult.error;
        }

        const eventDatesData = JsonGetEventDatesResponseSchema.parse(eventDatesResult.data);
        this.assertCollectionResponseValid(eventDatesData);

        const replacedTicketCategoryIdToMainIdMapper = new Map<string, string>();

        for (const eventDate of eventDatesData['hydra:member']) {
          const safeStartDate = eventDate.startDate || eventDate.startOfEventDay;
          const safeEndDate = eventDate.endDate || eventDate.endOfEventDay;

          assert(safeStartDate && safeEndDate);

          // [WORKAROUND] `@id` is a combination, we prefer to focus on the raw `id` but this one is not directly gettable for the `EventDate` entity
          const match = eventDate['@id'].match(/\/v1\/event_dates\/(\d+)/);

          assert(match && match[1]);

          schemaEvents.push(
            LiteEventSchema.parse({
              internalTicketingSystemId: match[1],
              startAt: safeStartDate,
              endAt: safeEndDate,
            })
          );

          // Since the Mapado logic differs from ours since it considers a category price per event date
          // whereas we do it per event serie... We try to merge those that are the same hoping it will work in most case
          // Note: we sort them first by "id" to be sure a new ticket price creation would not change the key (it's unlikely a previous created price would be deleted after any entry)
          const safeTickePriceList = eventDate.ticketPriceList.sort((a, b) => {
            return a.id - b.id;
          });

          for (const ticketPrice of safeTickePriceList) {
            assert(ticketPrice.name);

            const liteTicketCategory = LiteTicketCategorySchema.parse({
              internalTicketingSystemId: ticketPrice.id.toString(),
              name: ticketPrice.name,
              description: ticketPrice.description,
              price: ticketPrice.facialValue / 100, // Adjust since cents from their API (note this `ticketPrice.valueIncvat` do not include commission, this latter is only specified on each `Ticket` entity)
            });

            const similarLiteTicketCategory = schemaTicketCategories.find((anotherLiteRegisteredTicketCategory) => {
              return (
                liteTicketCategory.name === anotherLiteRegisteredTicketCategory.name &&
                liteTicketCategory.description === anotherLiteRegisteredTicketCategory.description &&
                liteTicketCategory.price === anotherLiteRegisteredTicketCategory.price
              );
            });

            if (similarLiteTicketCategory) {
              const currentMainId = replacedTicketCategoryIdToMainIdMapper.get(liteTicketCategory.internalTicketingSystemId);

              if (!currentMainId) {
                replacedTicketCategoryIdToMainIdMapper.set(
                  liteTicketCategory.internalTicketingSystemId,
                  similarLiteTicketCategory.internalTicketingSystemId
                );
              } else if (currentMainId !== similarLiteTicketCategory.internalTicketingSystemId) {
                // We make this check since we had to set `replacedTicketCategoryIdToMainIdMapper` outside this loop
                // To easily associate tickets to categories, but we don't want there is kind of leak between them
                throw new Error(`ticket category mapper item tries to point to 2 differents main categories`);
              }
            } else {
              schemaTicketCategories.push(liteTicketCategory);
            }

            // Now since internally we manage a unique tax rate per event serie, we make sure all prices are using the same
            if (taxRate === null) {
              taxRate = ticketPrice.tax.rate;
            } else if (taxRate !== ticketPrice.tax.rate) {
              // throw new Error(`an event serie should have the same tax rate for all dates and prices`)

              // [WORKAROUND] Until we decide the right way to do, just keep a tax rate none null
              taxRate = Math.max(taxRate, ticketPrice.tax.rate);
            }
          }
        }

        // Now retrieve all tickets for this event serie to bind them to ticket categories
        const ticketsResult = await getTicketCollection({
          client: this.client,
          query: {
            user: 'me',
            ticketing: ticketing['@id'],
            itemsPerPage: this.itemsPerPageToAvoidPagination,
            ...{ fields: 'status,ticketPrice,eventDate,isValid,imported' },
          },
        });

        if (ticketsResult.error) {
          throw ticketsResult.error;
        }

        const ticketsData = JsonGetTicketsResponseSchema.parse(ticketsResult.data);

        this.assertCollectionResponseValid(ticketsData);

        for (const ticket of ticketsData['hydra:member']) {
          // Only consider the ticket if the money has been transferred and is kept at the time of synchronization
          // (it excludes tickets that have been refunded)
          if (ticket.status !== 'payed') {
            continue;
          }

          // Some tickets have no ticket category, which is weird (they even don't have an order)
          // For now we saw them when they are imported into Mapada from somewhere else, for now we chose to skip them from being used as entry in our application
          if (ticket.ticketPrice === null) {
            if (ticket.imported) {
              continue;
            } else {
              // If it's a case not known for now, throw an error
              throw new Error(`a ticket has no "ticketPrice" whereas it has not been manually imported mapado, this should be investigated`);
            }
          }

          // [WORKAROUND] `ticketPrice` is a combination, we want the raw `id` to try matching ticket categories we have already parsed
          const ticketPriceMatch = ticket.ticketPrice.match(/\/v1\/ticket_prices\/(\d+)/);
          assert(ticketPriceMatch && ticketPriceMatch[1]);
          const ticketPriceId = ticketPriceMatch[1];

          // [WORKAROUND] `eventDate` is a combination, we want the raw `id` to try matching event date we have already parsed
          const eventDateMatch = ticket.eventDate.match(/\/v1\/event_dates\/(\d+)/);
          assert(eventDateMatch && eventDateMatch[1]);
          const eventDateId = eventDateMatch[1];

          // Make sure it belongs to a retrieved category
          // Note: due to our merge of different categories we take this into account
          const adjustedTicketPriceId = replacedTicketCategoryIdToMainIdMapper.get(ticketPriceId) || ticketPriceId;

          const correspondingTicketCategory = schemaTicketCategories.find((ticketCategory) => {
            return ticketCategory.internalTicketingSystemId === adjustedTicketPriceId;
          });

          assert(correspondingTicketCategory);

          const uniqueId = `${eventDateId}_${adjustedTicketPriceId}`;
          const eventSales = schemaEventSales.get(uniqueId);

          if (!eventSales) {
            // We make sure the event has been properly retrieved
            const relatedEvent = schemaEvents.find((event) => event.internalTicketingSystemId === eventDateId);
            if (!relatedEvent) {
              throw new Error('a sold ticket should always match an existing event');
            }

            schemaEventSales.set(
              uniqueId,
              LiteEventSalesSchema.parse({
                internalEventTicketingSystemId: eventDateId,
                internalTicketCategoryTicketingSystemId: adjustedTicketPriceId,
                total: 1,
              })
            );
          } else {
            eventSales.total += 1;
          }
        }
      }

      // Calculate the date range for the event serie
      let serieStartDate: Date | null = null;
      let serieEndDate: Date | null = null;

      for (const schemaEvent of schemaEvents) {
        if (serieStartDate === null || isBefore(schemaEvent.startAt, serieStartDate)) {
          serieStartDate = schemaEvent.startAt;
        }

        if (serieEndDate === null || isAfter(schemaEvent.endAt, serieEndDate)) {
          serieEndDate = schemaEvent.endAt;
        }
      }

      assert(serieStartDate !== null && serieEndDate !== null);
      assert(taxRate !== null);

      // [WORKAROUND] `@id` is a combination, we prefer to focus on the raw `id` but this one is not directly gettable for the `Ticketing` entity
      const ticketingMatch = ticketing['@id'].match(/\/v1\/ticketings\/(\d+)/);

      assert(ticketingMatch && ticketingMatch[1]);

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: ticketingMatch[1],
          name: ticketing.title,
          startAt: serieStartDate,
          endAt: serieEndDate,
          taxRate: taxRate,
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
