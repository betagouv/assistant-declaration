import { eachOfLimit } from 'async';
import { addYears } from 'date-fns';
import { ClientError, GraphQLClient } from 'graphql-request';

import { getSdk } from '@ad/src/client/dice/generated/graphql';
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
import { workaroundAssert as assert } from '@ad/src/utils/assert';

const debugGraphqlRequests = false;

const loggingFetch = async (url: RequestInfo, init?: RequestInit) => {
  console.log('[GraphQL REQUEST]');
  console.log('URL:', url);
  console.log('Method:', init?.method);
  console.log('Headers:', init?.headers);
  console.log('Body:', init?.body); // This contains the raw JSON with query & variables

  const response = await fetch(url, init);

  const clone = response.clone(); // To read it without consuming the stream
  const text = await clone.text();

  console.log('[GraphQL RESPONSE]');
  console.log(text);

  return response;
};

export class DiceTicketingSystemClient implements TicketingSystemClient {
  protected graphqlSdk: ReturnType<typeof getSdk>;
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;

  constructor(secretKey: string) {
    const graphqlClient = new GraphQLClient('https://partners-endpoint.dice.fm/graphql', {
      fetch: debugGraphqlRequests ? (loggingFetch as any) : fetch,
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    // [IMPORTANT] Since their API schema does not set "!" for fields required
    // we have to check a lot of propreties not being nullish...
    this.graphqlSdk = getSdk(graphqlClient);
  }

  protected assertCollectionResponseValid(edges: { totalCount: number | null; pageInfo: { hasNextPage: boolean } }) {
    assert(edges.totalCount !== null);

    // The limit to avoid pagination is so high the fetched data should fit inside this limit
    if (edges.totalCount > this.itemsPerPageToAvoidPagination || edges.pageInfo.hasNextPage) {
      throw new Error('our workaround to avoid handling pagination logic seems to not fit a specific case');
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection, so using a period range that would return no statement
      const futureDate = addYears(new Date(), 2);

      const orders = await this.graphqlSdk.GetOrders({
        first: this.itemsPerPageToAvoidPagination,
        after: null,
        fromDate: futureDate.toISOString(),
        toDate: futureDate.toISOString(),
      });

      assert(orders.viewer?.orders?.edges);
      this.assertCollectionResponseValid(orders.viewer.orders);

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    try {
      // We are relying on `Order, Return, TicketTransfer` to see if an event had recently a ticket mutation
      const recentOrders = await this.graphqlSdk.GetOrders({
        first: this.itemsPerPageToAvoidPagination,
        after: null,
        fromDate: fromDate.toISOString(),
        toDate: toDate ? toDate.toISOString() : undefined, // Setting `null` is making the server throwing an error
      });

      assert(recentOrders.viewer?.orders?.edges);
      this.assertCollectionResponseValid(recentOrders.viewer.orders);

      const recentReturns = await this.graphqlSdk.GetReturns({
        first: this.itemsPerPageToAvoidPagination,
        after: null,
        fromDate: fromDate.toISOString(),
        toDate: toDate ? toDate.toISOString() : undefined, // Setting `null` is making the server throwing an error
      });

      assert(recentReturns.viewer?.returns?.edges);
      this.assertCollectionResponseValid(recentReturns.viewer.returns);

      const recentTicketTransfers = await this.graphqlSdk.GetTicketTransfers({
        first: this.itemsPerPageToAvoidPagination,
        after: null,
        fromDate: fromDate.toISOString(),
        toDate: toDate ? toDate.toISOString() : undefined, // Setting `null` is making the server throwing an error
      });

      assert(recentTicketTransfers.viewer?.ticketTransfers?.edges);
      this.assertCollectionResponseValid(recentTicketTransfers.viewer.ticketTransfers);

      // Gather them to retrieve events
      const uniqueEventIds = new Set<string>();

      recentOrders.viewer.orders.edges.forEach((order) => {
        assert(order?.node?.event);

        uniqueEventIds.add(order.node.event.id);
      });

      recentReturns.viewer.returns.edges.forEach((returnItem) => {
        assert(returnItem?.node?.order?.event);

        uniqueEventIds.add(returnItem.node.order.event.id);
      });

      recentTicketTransfers.viewer.ticketTransfers.edges.forEach((ticketTransfer) => {
        assert(ticketTransfer?.node?.orders);

        ticketTransfer.node.orders.forEach((order) => {
          assert(order?.event);

          uniqueEventIds.add(order.event.id);
        });
      });

      // Retrieve all events to be processed individually
      const events = await this.graphqlSdk.GetEvents({
        first: this.itemsPerPageToAvoidPagination,
        after: null,
        ids: [...uniqueEventIds],
      });

      assert(events.viewer?.events?.edges);
      this.assertCollectionResponseValid(events.viewer.events);

      assert(events.viewer.events.edges.length === uniqueEventIds.size);

      const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

      // Note: for now we do not parallelize to not flood the ticketing system
      await eachOfLimit(events.viewer.events.edges, 1, async (event) => {
        assert(event?.node);
        assert(event.node.state);

        // We should finally not filter based on state here because the events we target are bound to tickets, so it has a real existence
        // // It seems we should consider all states once Dice has validated the event (`APPROVED`, `ARCHIVED`, `CANCELLED`)
        // if (['DRAFT', 'DECLINED', 'SUBMITTED', 'REVIEW'].includes(event.node.state)) {
        //   return;
        // }

        assert(event.node.ticketTypes);
        assert(event.node.name);
        assert(event.node.startDatetime);
        assert(event.node.endDatetime);

        const startDate = new Date(event.node.startDatetime);
        const endDate = new Date(event.node.endDatetime);

        const schemaEvents: LiteEventSchemaType[] = [];
        const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
        const schemaEventSales: Map<
          LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
          LiteEventSalesSchemaType
        > = new Map();

        // It's important to note Dice is having only "1 event serie = 1 event" (there is no multiple representations for the same serie)
        // We could have tried to merged them based on naming but it's kind of tricky before knowing well their customer usage of it
        schemaEvents.push(
          LiteEventSchema.parse({
            internalTicketingSystemId: event.node.id,
            startAt: startDate,
            endAt: endDate,
          })
        );

        let taxRate: number | null = null;

        // Get all tickets to be bound to ticket types
        const tickets = await this.graphqlSdk.GetTickets({
          first: this.itemsPerPageToAvoidPagination,
          after: null,
          eventId: event.node.id,
        });

        assert(tickets.viewer?.tickets?.edges);
        this.assertCollectionResponseValid(tickets.viewer.tickets);

        // At start we wanted to list `node.products.ticketTypes` but it seems `ticketTypes` can exist without any product
        // so directly fetching `node.ticketTypes`
        for (const ticketType of event.node.ticketTypes) {
          assert(ticketType);
          assert(ticketType.id);
          assert(ticketType.name);
          assert(ticketType.description);
          assert(ticketType.price !== null);

          const ticketCategoryId = ticketType.id;

          if (schemaTicketCategories.has(ticketCategoryId)) {
            throw new Error(`investigate the case of a ticket type being into multiple products`);
          }

          const ticketCategory = LiteTicketCategorySchema.parse({
            internalTicketingSystemId: ticketCategoryId,
            name: ticketType.name,
            description: ticketType.description,
            price: ticketType.faceValue / 100, // Dice exposes cents amounts
          });

          schemaTicketCategories.set(ticketCategoryId, ticketCategory);

          const categoryTickets = tickets.viewer.tickets.edges.filter((ticket) => {
            assert(ticket?.node?.ticketType);

            return ticket.node.ticketType.id === ticketType.id;
          });

          const uniqueSalesId = `${event.node.id}_${ticketCategory.internalTicketingSystemId}`;
          const eventSales = schemaEventSales.get(uniqueSalesId);

          if (!eventSales) {
            schemaEventSales.set(
              uniqueSalesId,
              LiteEventSalesSchema.parse({
                internalEventTicketingSystemId: event.node.id,
                internalTicketCategoryTicketingSystemId: ticketCategory.internalTicketingSystemId,
                total: categoryTickets.length,
              })
            );
          } else {
            throw new Error(`event sales should not exist since just once event per serie`);
          }

          // We go through all tickets just to make sure they are identical in term of pricing
          for (const categoryTicket of categoryTickets) {
            assert(categoryTicket?.node?.fullPrice && categoryTicket.node.fullPrice !== null);

            if (categoryTicket.node.fullPrice !== ticketType.faceValue) {
              throw new Error(`ticket ${categoryTicket.node.id} should have the same price than the ticket type ${ticketType.id}`);
            }

            // TODO:
            // TODO:
            // TODO: not sure yet how to retrieve the tax rate? (there should be a SALES_TAX amount on tickets but it's never filled...)
            // TODO:
            // TODO:
          }
        }

        assert(taxRate !== null);

        eventsSeriesWrappers.push({
          serie: LiteEventSerieSchema.parse({
            internalTicketingSystemId: event.node.id,
            name: event.node.name,
            startAt: startDate,
            endAt: endDate,
            taxRate: taxRate,
          }),
          events: schemaEvents,
          ticketCategories: Array.from(schemaTicketCategories.values()),
          sales: Array.from(schemaEventSales.values()),
        });
      });

      return eventsSeriesWrappers;
    } catch (error) {
      if (debugGraphqlRequests && error instanceof ClientError) {
        // Here to help debugging what has been sent since the stringified error caught above would not have the full detail
        console.log(error);
        console.log(JSON.stringify(error.response));
      }

      throw error;
    }
  }
}
