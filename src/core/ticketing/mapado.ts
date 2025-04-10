import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { eachOfLimit } from 'async';
import { isAfter, isBefore } from 'date-fns';

import { getEventDateCollection, getTicketCollection, getTicketingCollection } from '@ad/src/client/mapado';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { foreignTaxRateOnPriceError } from '@ad/src/models/entities/errors';
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
  JsonGetRecentPurchasedEventDatesResponseSchema,
  JsonGetRecentTicketsResponseSchema,
  JsonGetRecentTicketsToTestConnectionResponseSchema,
  JsonGetTicketingsResponseSchema,
  JsonGetTicketsResponseSchema,
  JsonRecentTicketSchemaType,
  JsonTicketingSchemaType,
} from '@ad/src/models/entities/mapado';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

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

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection
      const recentlyUpdatedTicketsToTestConnectionResult = await getTicketCollection({
        client: this.client,
        query: {
          user: 'me',
          updatedSince: new Date().toISOString(),
          itemsPerPage: 1,
          ...{ fields: 'updatedAt' },
        },
      });

      if (recentlyUpdatedTicketsToTestConnectionResult.error) {
        throw recentlyUpdatedTicketsToTestConnectionResult.error;
      }

      const recentlyUpdatedTicketsToTestConnectionData = JsonGetRecentTicketsToTestConnectionResponseSchema.parse(
        recentlyUpdatedTicketsToTestConnectionResult.data
      );

      this.assertCollectionResponseValid(recentlyUpdatedTicketsToTestConnectionData);

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // Get tickets modifications to know which events to synchronize (for the first time, or again)
    // Note: before we were doing a join on event date and without pagination, for some organizations it was breaking
    // at first synchronization and we had to handle the 2 differently. There was no way to skip this step at first synchronization
    // because sometimes could also synchronize months after with the same amount of data to retrieve
    const recentlyUpdatedTickets: JsonRecentTicketSchemaType[] = [];

    // There is a risk a ticket is "added" to the list while going across pagination (since not based on cursors), but this is not sensitive here
    let currentPage = 1;

    while (true) {
      const recentlyUpdatedTicketsResult = await getTicketCollection({
        client: this.client,
        query: {
          user: 'me',
          updatedSince: fromDate.toISOString(),
          itemsPerPage: 10_000, // After testing we saw this limit was not erroring the Mapado API
          page: currentPage,
          ...{ fields: 'eventDate,updatedAt' },
        },
      });

      if (recentlyUpdatedTicketsResult.error) {
        throw recentlyUpdatedTicketsResult.error;
      }

      const recentlyUpdatedTicketsData = JsonGetRecentTicketsResponseSchema.parse(recentlyUpdatedTicketsResult.data);

      this.assertCollectionResponseValid(recentlyUpdatedTicketsData);

      recentlyUpdatedTicketsData['hydra:member'].forEach((ticket) => {
        recentlyUpdatedTickets.push(ticket);
      });

      if (!recentlyUpdatedTicketsData['hydra:nextPage']) {
        break;
      }

      currentPage++;
    }

    // Since there is no API `before` we simulate it to be consistent across tests (despite getting more data over time)
    const tickets = toDate ? recentlyUpdatedTickets.filter((ticket) => isBefore(ticket.updatedAt, toDate)) : recentlyUpdatedTickets;

    // Retrieve eligible event series from events dates
    const uniqueEventDatesIds = [...new Set(tickets.map((ticket) => ticket.eventDate))];

    // For a few organisations having a lot of event dates it was triggering either the server error
    // `400 Bad Request`, or when reducing a bit the URL length, `414 Request-URI Too Large` so we try to
    // use the short ID to go under limit. If it persists for another organization we would have to split the request
    const uniqueShortEventDatesIds = uniqueEventDatesIds.map((id) => id.replace(/^\/v1\/event_dates\//, ''));

    let ticketingsToSynchronize: JsonTicketingSchemaType[];
    if (uniqueShortEventDatesIds.length > 0) {
      const recentlyPurchasedEventDatesResult = await getEventDateCollection({
        client: this.client,
        query: {
          '@id': uniqueShortEventDatesIds.join(','),
          itemsPerPage: this.itemsPerPageToAvoidPagination,
          ...{ fields: 'ticketing' },
        },
      });

      if (recentlyPurchasedEventDatesResult.error) {
        throw recentlyPurchasedEventDatesResult.error;
      }

      const recentlyPurchasedEventDatesData = JsonGetRecentPurchasedEventDatesResponseSchema.parse(recentlyPurchasedEventDatesResult.data);

      this.assertCollectionResponseValid(recentlyPurchasedEventDatesData);

      // We did not get ticketings as associations in the previous call otherwise it would return a lot of copies
      const ticketingIdsToSynchronize: string[] = [
        ...new Set(
          recentlyPurchasedEventDatesData['hydra:member'].map((eventDate) => {
            return eventDate.ticketing;
          })
        ),
      ];

      // As for the `event_dates` endpoint and just in case we use the short IDs to avoid `414 Request-URI Too Large`
      const shortTicketingIdsToSynchronize = ticketingIdsToSynchronize.map((id) => id.replace(/^\/v1\/ticketings\//, ''));

      const ticketingsResult = await getTicketingCollection({
        client: this.client,
        query: {
          '@id': shortTicketingIdsToSynchronize.join(','),
          itemsPerPage: this.itemsPerPageToAvoidPagination,
          ...{ fields: 'type,title,eventDateList,currency,venue{countryCode}' },
        },
      });

      if (ticketingsResult.error) {
        throw ticketingsResult.error;
      }

      const ticketingsData = JsonGetTicketingsResponseSchema.parse(ticketingsResult.data);

      this.assertCollectionResponseValid(ticketingsData);

      ticketingsToSynchronize = ticketingsData['hydra:member'].filter((ticketing) => {
        // Mapado allows creating "ticketings" that are not directly linked to a live performance
        // Like a subscription, a "free solidarity ticket", an offer... So we skip those since not appropriate for us
        if (ticketing.type !== 'dated_events') {
          return false;
        }

        // A live performance taking place outside France has no reason to be declared
        // (skipping them helps not messing with different tax rate grids)
        // Note: sometimes it's not filled, but since Mapado is french we assume a null country code means France
        if (ticketing.venue !== null && ticketing.venue.countryCode !== null && ticketing.venue.countryCode !== 'FR') {
          return false;
        }

        return true;
      });
    } else {
      ticketingsToSynchronize = [];
    }

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(ticketingsToSynchronize, 1, async (ticketing) => {
      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: LiteTicketCategorySchemaType[] = [];
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      let taxRate: number | null = null;

      if (ticketing.eventDateList.length > 0) {
        // As for the `event_dates` endpoint and just in case we use the short IDs to avoid `414 Request-URI Too Large`
        const shortEventDatesIds = ticketing.eventDateList.map((id) => id.replace(/^\/v1\/event_dates\//, ''));

        // Thanks to associations we can retrieve "price category"
        // Note: it won't have duplicate entries since `TicketPrice` entity is unique per event (it causes us complications below to aggregate them due to our internal structure)
        const eventDatesResult = await getEventDateCollection({
          client: this.client,
          query: {
            '@id': shortEventDatesIds.join(','),
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
            // At the beginning of the synchronization we made sure keeping only live performances taking place in France
            // but it appears multiple prices could use tax rates from different countries (outside France), which could be problematic
            // in our interface and for the user to reason
            // Note: if the tax country code is not filled, we consider it as being for France
            if (ticketPrice.tax.countryCode !== null && ticketPrice.tax.countryCode !== 'FR') {
              throw foreignTaxRateOnPriceError;
            }

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
