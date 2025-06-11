import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';

export class DiceTicketingSystemClient implements TicketingSystemClient {
  constructor(secretKey: string) {}

  public async testConnection(): Promise<boolean> {
    try {
      // TODO:

      return true;
    } catch (error) {
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // TODO:
    return [];
  }
}
