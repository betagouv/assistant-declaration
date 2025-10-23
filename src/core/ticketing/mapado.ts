import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { eachOfLimit } from 'async';
import { isBefore } from 'date-fns';

import { getEventDateCollection, getTicketCollection, getTicketingCollection } from '@ad/src/client/mapado';
import { getExcludingTaxesAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { foreignTaxRateOnPriceError } from '@ad/src/models/entities/errors';
import { LiteEventSchema, LiteEventSchemaType, LiteEventSerieSchema, LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import {
  JsonCollectionSchemaType,
  JsonGetEventDatesResponseSchema,
  JsonGetRecentPurchasedEventDatesResponseSchema,
  JsonGetRecentTicketsResponseSchema,
  JsonGetRecentTicketsToTestConnectionResponseSchema,
  JsonGetTicketingsResponseSchema,
  JsonGetTicketsResponseSchema,
  JsonRecentTicketSchemaType,
  JsonTicketSchemaType,
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
    let recentlyUpdatedTicketsCurrentPage = 1;

    while (true) {
      const recentlyUpdatedTicketsResult = await getTicketCollection({
        client: this.client,
        query: {
          user: 'me',
          updatedSince: fromDate.toISOString(),
          itemsPerPage: 10_000, // After testing we saw this limit was not erroring the Mapado API
          page: recentlyUpdatedTicketsCurrentPage,
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

      recentlyUpdatedTicketsCurrentPage++;
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
      const ticketingIdsToSynchronize = new Set<string>();

      // Despite reducing the ID length, a few organizations have reached `414 Request-URI Too Large` so we chunk them by groups
      const chunkSize = 500;
      const chunks: (typeof uniqueShortEventDatesIds)[] = [];

      for (let i = 0; i < uniqueShortEventDatesIds.length; i += chunkSize) {
        chunks.push(uniqueShortEventDatesIds.slice(i, i + chunkSize));
      }

      for (const chunkOfUniqueShortEventDatesIds of chunks) {
        const recentlyPurchasedEventDatesResult = await getEventDateCollection({
          client: this.client,
          query: {
            '@id': chunkOfUniqueShortEventDatesIds.join(','),
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
        recentlyPurchasedEventDatesData['hydra:member'].forEach((eventDate) => {
          ticketingIdsToSynchronize.add(eventDate.ticketing);
        });
      }

      // As for the `event_dates` endpoint and just in case we use the short IDs to avoid `414 Request-URI Too Large`
      const shortTicketingIdsToSynchronize = [...ticketingIdsToSynchronize].map((id) => id.replace(/^\/v1\/ticketings\//, ''));

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
        if (
          ticketing.venue !== null &&
          ticketing.venue.countryCode !== null &&
          ticketing.venue.countryCode !== 'FR' &&
          ticketing.venue.countryCode !== 'CORSE'
        ) {
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
      const schemaEvents: Map<LiteEventSchemaType['internalTicketingSystemId'], LiteEventSchemaType> = new Map();

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
                '@id,startDate,endDate,startOfEventDay,ticketPriceList{@id,id,type,name,description,currency,facialValue,tax{rate,countryCode},valueIncvat}',
            },
          },
        });

        if (eventDatesResult.error) {
          throw eventDatesResult.error;
        }

        const eventDatesData = JsonGetEventDatesResponseSchema.parse(eventDatesResult.data);
        this.assertCollectionResponseValid(eventDatesData);

        const ticketPriceIdToTaxRateAndAmount = new Map<
          string,
          {
            taxRate: number;
            amount: number;
          }
        >();

        for (const eventDate of eventDatesData['hydra:member']) {
          // `startDate` is mandatory so falling back to `startOfEventDay` if needed (`endDate` is optional on our side so not using something not meaningful)
          const safeStartDate = eventDate.startDate || eventDate.startOfEventDay;
          const safeEndDate = eventDate.endDate;

          // We faced some organizations having ticketings being `type: 'dated_events'` but that had no date at all
          // We cannot say if it's normal or a bug due to a Mapado evolution, but since some had those ticketings already closed
          // they had no way to change their type to `undated_event` or `offer`... so we just skip them
          if (!safeStartDate) {
            return;
          }

          for (const ticketPrice of eventDate.ticketPriceList) {
            // At the beginning of the synchronization we made sure keeping only live performances taking place in France
            // but it appears multiple prices could use tax rates from different countries (outside France), which could be problematic
            // in our interface and for the user to reason
            // Note: if the tax country code is not filled, we consider it as being for France
            if (ticketPrice.tax.countryCode !== null && ticketPrice.tax.countryCode !== 'FR' && ticketPrice.tax.countryCode !== 'CORSE') {
              throw foreignTaxRateOnPriceError;
            }

            ticketPriceIdToTaxRateAndAmount.set(ticketPrice['@id'], {
              taxRate: ticketPrice.tax.rate,
              amount: ticketPrice.facialValue / 100, // 2000 is 20€
            });
          }

          let indicativeTaxRate: number | null = null;

          // Note: a ticket category being free may have a 0% tax rate instead of being aligned with others, to take into account this case
          // it's easier having them at the end (because if only free categories, the tax rate should be 0, not null)
          const validTicketPriceListSortedWithDescendingTaxRates = Array.from(ticketPriceIdToTaxRateAndAmount.values()).sort(
            (a, b) => +b.taxRate - +a.taxRate
          );

          for (const ticketPrice of validTicketPriceListSortedWithDescendingTaxRates) {
            let ticketPriceVatRate = ticketPrice.taxRate;

            if (indicativeTaxRate !== null) {
              // See comment about sorting ticketPrices to understand why alignin tax rates when price is 0
              if (ticketPrice.amount === 0 && ticketPriceVatRate === 0) {
                ticketPriceVatRate = indicativeTaxRate;
              }

              // If the event mixes multiple tax rates set it to null since we are not managing this
              // Unfortunately it will cause the excluding taxes total being wrong but we are fine letting the end user correcting this
              if (indicativeTaxRate !== ticketPriceVatRate) {
                indicativeTaxRate = null;

                break;
              }
            }

            indicativeTaxRate = ticketPriceVatRate;
          }

          // [WORKAROUND] `@id` is a combination, we prefer to focus on the raw `id` but this one is not directly gettable for the `EventDate` entity
          const match = eventDate['@id'].match(/\/v1\/event_dates\/(\d+)/);

          assert(match && match[1]);

          schemaEvents.set(
            match[1],
            LiteEventSchema.parse({
              internalTicketingSystemId: match[1],
              startAt: safeStartDate,
              endAt: safeEndDate,
              ticketingRevenueIncludingTaxes: 0,
              ticketingRevenueExcludingTaxes: 0,
              ticketingRevenueTaxRate: indicativeTaxRate,
              freeTickets: 0,
              paidTickets: 0,
            })
          );
        }

        // If all dates have been skipped, no need to retrieve other informations
        if (schemaEvents.size === 0) {
          return;
        }

        // Now retrieve all tickets for this event serie to bind them to the correct event date
        const tickets: JsonTicketSchemaType[] = [];

        // There is a risk a ticket is "added" to the list while going across pagination (since not based on cursors), but this is an inevitable risk
        let ticketsCurrentPage = 1;

        while (true) {
          const ticketsResult = await getTicketCollection({
            client: this.client,
            query: {
              user: 'me',
              ticketing: ticketing['@id'],
              itemsPerPage: 10_000, // After testing we saw this limit was not erroring the Mapado API
              page: ticketsCurrentPage,
              ...{ fields: '@id,status,facialValue,ticketPrice,eventDate,isValid,imported' },
            },
          });

          if (ticketsResult.error) {
            throw ticketsResult.error;
          }

          const ticketsData = JsonGetTicketsResponseSchema.parse(ticketsResult.data);

          this.assertCollectionResponseValid(ticketsData);

          ticketsData['hydra:member'].forEach((ticket) => {
            tickets.push(ticket);
          });

          if (!ticketsData['hydra:nextPage']) {
            break;
          }

          ticketsCurrentPage++;
        }

        for (const ticket of tickets) {
          // Only consider the ticket if the money has been transferred and is kept at the time of synchronization
          // (it excludes tickets that have been refunded)
          if (ticket.status !== 'payed') {
            continue;
          }

          // Some tickets have no ticket category, which is weird (they even don't have an order)
          // For now we saw them when they are imported into Mapado from somewhere else, for now we chose to skip them from being used as entry in our application
          // TODO: if they need to be taken into account, what tax rate to apply? The indicative one? But at risk... better the the user adjust amounts manually to include external things?
          if (ticket.ticketPrice === null) {
            if (ticket.imported) {
              continue;
            } else {
              // If it's a case not known for now, throw an error
              throw new Error(`a ticket has no "ticketPrice" whereas it has not been manually imported mapado, this should be investigated`);
            }
          }

          const ticketPriceProperties = ticketPriceIdToTaxRateAndAmount.get(ticket.ticketPrice);
          if (ticketPriceProperties === undefined) {
            console.warn(
              'make sure you are not debugging just a few event dates on the ticketing entity, because getting tickets is scoped to all dates'
            );

            throw new Error('a sold ticket should always match a ticket category');
          }

          // For whatever reason some valid tickets have all amounts:
          // - null despite NOT being imported and NOT being refunded or so
          // - negative despite NOT being imported and NOT being refunded or so
          //
          // Maybe it's the case when they migrate a customer from another ticketing system and some informations are wrongly applied
          // Since it's not clear what's the origin of the problem, we take the amount on the bound `ticketPrice`
          //
          // Note: it's unclear if the property `paidValue` (not cents) is always the same than `facialValue` (cents), and if the commission is deduced
          // but we confirmed the ticket `facialValue` may be different han the ticket category `facialValue`, but is it due to dynamic price or it really represents the paid amount
          // (we kept using the `facialValue` property since that's the only one available on the `ticketPrice` used as fallback)
          let ticketPriceIncludingTaxes: number;
          if (ticket.facialValue === null || ticket.facialValue < 0) {
            ticketPriceIncludingTaxes = ticketPriceProperties.amount;
          } else {
            ticketPriceIncludingTaxes = ticket.facialValue / 100; // 2000 is 20€
          }

          assert(ticketPriceIncludingTaxes >= 0, 'ticket price must be non-negative');

          // [WORKAROUND] `eventDate` is a combination, we want the raw `id` to try matching event date we have already parsed
          const eventDateMatch = ticket.eventDate.match(/\/v1\/event_dates\/(\d+)/);
          assert(eventDateMatch && eventDateMatch[1]);
          const eventDateId = eventDateMatch[1];

          const relatedEvent = schemaEvents.get(eventDateId);

          if (!relatedEvent) {
            throw new Error('a sold ticket should always match an existing event');
          }

          if (ticketPriceIncludingTaxes === 0) {
            relatedEvent.freeTickets++;
          } else {
            relatedEvent.paidTickets++;
            relatedEvent.ticketingRevenueIncludingTaxes += ticketPriceIncludingTaxes;
            relatedEvent.ticketingRevenueExcludingTaxes += getExcludingTaxesAmountFromIncludingTaxesAmount(
              ticketPriceIncludingTaxes,
              ticketPriceProperties.taxRate
            );
          }
        }
      }

      // [WORKAROUND] `@id` is a combination, we prefer to focus on the raw `id` but this one is not directly gettable for the `Ticketing` entity
      const ticketingMatch = ticketing['@id'].match(/\/v1\/ticketings\/(\d+)/);

      assert(ticketingMatch && ticketingMatch[1]);

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: ticketingMatch[1],
          name: ticketing.title,
        }),
        events: Array.from(schemaEvents.values()),
      });
    });

    return eventsSeriesWrappers;
  }
}
