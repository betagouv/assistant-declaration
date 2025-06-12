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
        fromDate: futureDate,
        toDate: futureDate,
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
        fromDate: fromDate,
        toDate: toDate,
      });

      assert(recentOrders.viewer?.orders?.edges);
      this.assertCollectionResponseValid(recentOrders.viewer.orders);

      const recentReturns = await this.graphqlSdk.GetReturns({
        first: this.itemsPerPageToAvoidPagination,
        after: null,
        fromDate: fromDate,
        toDate: toDate,
      });

      assert(recentReturns.viewer?.returns?.edges);
      this.assertCollectionResponseValid(recentReturns.viewer.returns);

      const recentTicketTransfers = await this.graphqlSdk.GetTicketTransfers({
        first: this.itemsPerPageToAvoidPagination,
        after: null,
        fromDate: fromDate,
        toDate: toDate,
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
        assert(event?.node.products);
        assert(event?.node.name);

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
            internalTicketingSystemId: event.node.id.toString(),
            startAt: event.node.startDatetime,
            endAt: event.node.endDatetime,
          })
        );

        let taxRate: number | null = null;

        for (const product of event.node.products) {
          assert(product?.ticketTypes);

          for (const ticketType of product.ticketTypes) {
            assert(ticketType);
            assert(ticketType.id);
            assert(ticketType.name);
            assert(ticketType.description);
            assert(ticketType.price !== null);
            assert(ticketType.totalTicketAllocationQty !== null);

            const ticketCategoryId = ticketType.id.toString();

            if (schemaTicketCategories.has(ticketCategoryId)) {
              throw new Error(`investigate the case of a ticket type being into multiple products`);
            }

            const ticketCategory = LiteTicketCategorySchema.parse({
              internalTicketingSystemId: ticketCategoryId,
              name: ticketType.name,
              description: ticketType.description,
              price: ticketType.price / 100, // Dice exposes cents amounts
            });

            schemaTicketCategories.set(ticketCategoryId, ticketCategory);

            const uniqueSalesId = `${event.node.id}_${ticketCategory.internalTicketingSystemId}`;

            schemaEventSales.set(
              uniqueSalesId,
              LiteEventSalesSchema.parse({
                internalEventTicketingSystemId: event.node.id.toString(),
                internalTicketCategoryTicketingSystemId: ticketCategory.internalTicketingSystemId,
                total: ticketType.totalTicketAllocationQty,
              })
            );
          }

          // TODO:
          // TODO:
          // TODO: not sure yet how to retrieve the tax rate? (there is a SALES_TAX amount but only through each tickets?)
          // TODO: also, should number of sales be through `ticketType.totalTicketAllocationQty` or by browser all tickets?
          // TODO: ... to test
          // TODO:
          // TODO:
        }

        assert(taxRate !== null);

        eventsSeriesWrappers.push({
          serie: LiteEventSerieSchema.parse({
            internalTicketingSystemId: event.node.id.toString(),
            name: event.node.name,
            startAt: event.node.startDatetime,
            endAt: event.node.endDatetime,
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
