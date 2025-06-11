import { GraphQLClient } from 'graphql-request';

import { getSdk } from '@ad/src/client/dice/generated/graphql';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';

export class DiceTicketingSystemClient implements TicketingSystemClient {
  protected graphqlSdk: ReturnType<typeof getSdk>;

  constructor(secretKey: string) {
    const graphqlClient = new GraphQLClient('https://partners-endpoint.dice.fm/graphql', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    this.graphqlSdk = getSdk(graphqlClient);
  }

  public async testConnection(): Promise<boolean> {
    try {
      // TODO:

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const events = await this.graphqlSdk.GetEvents();

    // getOrders + getReturns (to see events) + getAdjustments (to see events)
    // or maybe... "ticketTransfer" but not sure if that's what we are looking for! (transfert de tickets ? ou "émission de tickets" ils veulent dire ?)
    // et ticketTransfer gère p-e pas quand le ticket est "retourné"...

    // getEvents(ids) with tickettypes inside...

    // TODO:
    return [];
  }
}
