import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { eachOfLimit } from 'async';
import { addYears, isAfter, isBefore } from 'date-fns';

import {
  authorize,
  findAllEventBySalesChannelId,
  findAllShowByEventAndSalesChannelId,
  findPricesByShowId,
  findTransactions,
  getEntriesList,
  getEventDetails,
} from '@ad/src/client/rodrigue';
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
  JsonEntrySchemaType,
  JsonEventSchemaType,
  JsonGetEventsDetailsResponseSchema,
  JsonListEntriesResponseSchema,
  JsonListEventsResponseSchema,
  JsonListPricesResponseSchema,
  JsonListShowsResponseSchema,
  JsonListTransactionsResponseSchema,
  JsonPriceSchemaType,
  JsonShowSchemaType,
  JsonTransactionSchemaType,
} from '@ad/src/models/entities/rodrigue';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class RodrigueTicketingSystemClient implements TicketingSystemClient {
  protected readonly client: Client;
  protected readonly maximumItemsPerPage: number = 200;

  constructor(
    private accessKey: string,
    private secretKey: string
  ) {
    this.client = createClient(
      createConfig({
        baseUrl: 'https://front.apirecette.digitick-ppe.com/v1.1',
      })
    );
  }

  public async login(): Promise<string> {
    const encodedCredentials = Buffer.from(`${this.accessKey}:${this.secretKey}`).toString('base64');

    const authResult = await authorize({
      client: this.client,
      headers: {
        Authorization: `Basic ${encodedCredentials}`, // Did not succeed using properties `security+auth`, so falling back to raw headers
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'catalog distribution document order user venue pos user:merge order:refund order:transfer modifUserId:XX',
      }).toString() as any, // The OpenAPI schema does not allow this but at runtime it's passed in their documentation
    });

    if (authResult.error) {
      throw authResult.error;
    }

    assert(authResult.data.accessToken);

    return authResult.data.accessToken;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const salesChannelId = 10809;

      const accessToken = await this.login();

      const eventsResult = await findAllEventBySalesChannelId({
        client: this.client,
        auth: accessToken,
        path: {
          salesChannelId: salesChannelId,
        },
        query: {
          offset: 0,
          limit: 1,
        },
      });

      if (eventsResult.error) {
        throw eventsResult.error;
      }

      const eventsData = JsonListEventsResponseSchema.parse(eventsResult.data);

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const salesChannelId = 10809;

    const accessToken = await this.login();

    // SeeTickets pagination is really restrictive by allowing only 200 items per request, and the only "recently updated" filter
    // we can have is on financial transactions, so from those we have to find bought tickets and then events to fully synchronize
    // Note: the "refunded transaction" endpoint returns another type of entity bound to a "transaction", so we should have them fetched in the following too
    let recentTransactions: JsonTransactionSchemaType[] = [];
    let recentTransactionsCurrentPage = 0;

    while (true) {
      // Note: using offset pagination instead of cursor one is a bit at risk in case of added items
      // in the meantime, but we have no other way
      recentTransactionsCurrentPage++;

      const recentTransactionsResult = await findTransactions({
        client: this.client,
        auth: accessToken,
        query: {
          'filters[salesChannelId][]': [salesChannelId],
          'filters[afterPurchaseDate]': fromDate.toISOString(),
          'orderBy[id]': 'asc', // Make sure new ones will be at the end to not break pagination in case of order in the meantime
          offset: (recentTransactionsCurrentPage - 1) * this.maximumItemsPerPage,
          limit: this.maximumItemsPerPage,
        },
      });

      if (recentTransactionsResult.error) {
        throw recentTransactionsResult.error;
      }

      const recentTransactionsData = JsonListTransactionsResponseSchema.parse(recentTransactionsResult.data);

      recentTransactions.push(...recentTransactionsData._embedded.transactions);

      // If there is less the limit it means it's the last page
      if (recentTransactionsData._embedded.transactions.length < this.maximumItemsPerPage) {
        break;
      }
    }

    // Since there is no API `beforePurchaseDate` we simulate it to be consistent across tests (despite getting more data over time)
    if (toDate) {
      recentTransactions = recentTransactions.filter((transaction) => isBefore(transaction.purchaseDate.date, toDate));
    }

    const recentTransactionsIds = recentTransactions.map((transaction) => transaction.id);

    // Now we need to get events IDs from tickets recently purchased to only resynchronize what's needed
    let recentEntries: JsonEntrySchemaType[] = [];

    if (recentTransactionsIds.length > 0) {
      let recentEntriesCurrentPage = 0;

      while (true) {
        // Note: using offset pagination instead of cursor one is a bit at risk in case of added items
        // in the meantime, but we have no other way
        recentEntriesCurrentPage++;

        const recentEntriesResult = await getEntriesList({
          client: this.client,
          auth: accessToken,
          query: {
            'filters[transactionId][]': recentTransactionsIds, // We use transaction to be less long then with tickets IDs (but we are still likely to reach URL length limit)
            offset: (recentEntriesCurrentPage - 1) * this.maximumItemsPerPage,
            limit: this.maximumItemsPerPage,
          },
        });

        if (recentEntriesResult.error) {
          throw recentEntriesResult.error;
        }

        const recentEntriesData = JsonListEntriesResponseSchema.parse(recentEntriesResult.data);

        recentEntries.push(...recentEntriesData._embedded.entries);

        // If there is less the limit it means it's the last page
        if (recentEntriesData._embedded.entries.length < this.maximumItemsPerPage) {
          break;
        }
      }
    }

    const eventsIds = new Set<number>();

    recentEntries.forEach((entry) => eventsIds.add(entry.eventId));

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(Array.from(eventsIds), 1, async (eventId) => {
      // We wanted to get metadata of every events at once but there the filter on `productId` cannot accept array
      // so we have to do it for each one
      const eventDetailsResult = await getEventDetails({
        client: this.client,
        auth: accessToken,
        path: {
          eventId: eventId,
        },
      });

      if (eventDetailsResult.error) {
        throw eventDetailsResult.error;
      }

      const eventDetailsData = JsonGetEventsDetailsResponseSchema.parse(eventDetailsResult.data as any);

      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: LiteTicketCategorySchemaType[] = [];
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      // Get shows (unlikely to be paginated but just in case...)
      let shows: JsonShowSchemaType[] = [];
      let showsCurrentPage = 0;

      while (true) {
        // Note: using offset pagination instead of cursor one is a bit at risk in case of added items
        // in the meantime, but we have no other way
        showsCurrentPage++;

        const showsResult = await findAllShowByEventAndSalesChannelId({
          client: this.client,
          auth: accessToken,
          path: {
            salesChannelId: salesChannelId,
            eventId: eventId,
          },
          query: {
            offset: (showsCurrentPage - 1) * this.maximumItemsPerPage,
            limit: this.maximumItemsPerPage,
          },
        });

        if (showsResult.error) {
          throw showsResult.error;
        }

        const showsData = JsonListShowsResponseSchema.parse(showsResult.data);

        shows.push(...showsData._embedded.shows);

        // If there is less the limit it means it's the last page
        if (showsData._embedded.shows.length < this.maximumItemsPerPage) {
          break;
        }
      }

      const eventPrices: JsonPriceSchemaType[] = [];

      for (const show of shows) {
        schemaEvents.push(
          LiteEventSchema.parse({
            internalTicketingSystemId: show.id.toString(),
            startAt: show.start,
            endAt: show.end,
          })
        );

        // Retrieve ticket categories
        let prices: JsonPriceSchemaType[] = [];
        let pricesCurrentPage = 0;

        while (true) {
          // Note: using offset pagination instead of cursor one is a bit at risk in case of added items
          // in the meantime, but we have no other way
          pricesCurrentPage++;

          const pricesResult = await findPricesByShowId({
            client: this.client,
            auth: accessToken,
            path: {
              salesChannelId: salesChannelId,
              showId: show.id,
            },
            query: {
              addPendingPrices: true,
              offset: (pricesCurrentPage - 1) * this.maximumItemsPerPage,
              limit: this.maximumItemsPerPage,
            },
          });

          if (pricesResult.error) {
            throw pricesResult.error;
          }

          const pricesData = JsonListPricesResponseSchema.parse(pricesResult.data);

          prices.push(...pricesData._embedded.prices);

          // If there is less the limit it means it's the last page
          if (pricesData._embedded.prices.length < this.maximumItemsPerPage) {
            break;
          }
        }

        eventPrices.push(...prices);
      }

      // Sort prices per ID to always have the same order when doing `.find()` on it despite prices mutations
      // (since not having unique identifier when matching entries)
      const safeEventPrices = eventPrices.sort((a, b) => {
        return a.id - b.id;
      });

      for (const price of safeEventPrices) {
        // Since we retrieve prices per show (not event), we make sure to not have duplicates
        let ticketCategory = schemaTicketCategories.find((sTC) => {
          return sTC.internalTicketingSystemId === price.id.toString();
        });

        if (!ticketCategory) {
          ticketCategory = LiteTicketCategorySchema.parse({
            internalTicketingSystemId: price.id.toString(),
            name: price.name,
            description: null,
            price: price.valueWithoutFeesCents / 100, // Since 500 cents must be 5.00 €
          });

          schemaTicketCategories.push(ticketCategory);
        }
      }

      // Since there is no easy way to get the sum of sold tickets, we have to browse all of them per SeeTickets "event" (not "show")
      // to match them with the appropriate price
      let entries: JsonEntrySchemaType[] = [];
      let entriesCurrentPage = 0;

      while (true) {
        // Note: using offset pagination instead of cursor one is a bit at risk in case of added items
        // in the meantime, but we have no other way
        entriesCurrentPage++;

        const entriesResult = await getEntriesList({
          client: this.client,
          auth: accessToken,
          query: {
            'filters[eventId][]': [eventId],
            offset: (entriesCurrentPage - 1) * this.maximumItemsPerPage,
            limit: this.maximumItemsPerPage,
          },
        });

        if (entriesResult.error) {
          throw entriesResult.error;
        }

        const entriesData = JsonListEntriesResponseSchema.parse(entriesResult.data);

        entries.push(...entriesData._embedded.entries);

        // If there is less the limit it means it's the last page
        if (entriesData._embedded.entries.length < this.maximumItemsPerPage) {
          break;
        }
      }

      for (const entry of entries) {
        // Unfortunately there is no `priceId` provided so we do this based on the price name and amount...
        // despite of their documentation saying `priceId` has been added on ticket list, it's not
        // There is a risk if 2 same prices (name+amount) to let the second empty but we have no other choice
        let schemaTicketCategory = schemaTicketCategories.find((sTC) => {
          return sTC.name === entry.priceLabel && sTC.price === entry.priceAmountCents / 100;
        });

        assert(schemaTicketCategory);

        let schemaEvent = schemaEvents.find((sE) => {
          return sE.internalTicketingSystemId === entry.showId.toString();
        });

        assert(schemaEvent);

        const uniqueId = `${schemaTicketCategory.internalTicketingSystemId}_${schemaEvent.internalTicketingSystemId}`;
        const eventSales = schemaEventSales.get(uniqueId);

        if (!eventSales) {
          schemaEventSales.set(
            uniqueId,
            LiteEventSalesSchema.parse({
              internalEventTicketingSystemId: schemaEvent.internalTicketingSystemId,
              internalTicketCategoryTicketingSystemId: schemaTicketCategory.internalTicketingSystemId,
              total: 1,
            })
          );
        } else {
          eventSales.total += 1;
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

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: eventDetailsData.id.toString(),
          name: eventDetailsData.name,
          startAt: serieStartDate,
          endAt: serieEndDate,
          taxRate: eventDetailsData.vatPercentage,
        }),
        events: schemaEvents,
        ticketCategories: schemaTicketCategories,
        sales: Array.from(schemaEventSales.values()),
      });

      // eventsData._embedded.products.
      // TODO:
      // TODO: empty collection seems to be 400 HTTP error... ???
      // TODO:
      // TODO:
      // TODO: api rate limit to log in... 1req/10min... try? if so keep in memory for 10 minutes
      // TODO: needed for testConnectivity followed by sync
      // TODO:
      // TODO:
      // TODO: return 400 is an entity list return 0 item!?
      // TODO:
      // TODO:
    });

    return eventsSeriesWrappers;
  }
}
