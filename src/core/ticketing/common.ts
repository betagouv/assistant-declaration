import { set } from 'date-fns';

import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { TicketingSystemNameSchemaType } from '@ad/src/models/entities/ticketing';
import { sleep } from '@ad/src/utils/sleep';

export const ticketingSystemRequiresApiAccessKey: Record<TicketingSystemNameSchemaType, boolean> = {
  BILLETWEB: true,
  HELLOASSO: true,
  MAPADO: false,
  SHOTGUN: true,
  SOTICKET: true,
  SUPERSONIKS: true,
};

export interface TicketingSystemClient {
  testConnection(): Promise<boolean>;
  getEventsSeries(fromDate: Date): Promise<LiteEventSerieWrapperSchemaType[]>;
}

export class MockTicketingSystemClient implements TicketingSystemClient {
  public async testConnection(): Promise<boolean> {
    // Simulate loading
    await sleep(1000);

    return true;
  }

  public async getEventsSeries(fromDate: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // Simulate loading
    await sleep(4000);

    // For now return always the same data to prove differences detection works
    return [
      {
        serie: {
          internalTicketingSystemId: 's1',
          name: 'Mon premier coucou',
        },
        events: [
          {
            internalTicketingSystemId: 'e1-1',
            startAt: set(new Date(0), { year: 2024, month: 11, date: 18 }),
            endAt: set(new Date(0), { year: 2024, month: 11, date: 19 }),
            ticketingRevenueExcludingTaxes: 100,
            ticketingRevenueIncludingTaxes: 105.5,
            ticketingRevenueTaxRate: 0.055,
            freeTickets: 23,
            paidTickets: 10,
          },
        ],
      },
      {
        serie: {
          internalTicketingSystemId: 's2',
          name: 'Un coucou au soleil',
        },
        events: [
          {
            internalTicketingSystemId: 'e2-1',
            startAt: set(new Date(0), { year: 2024, month: 12, date: 1 }),
            endAt: set(new Date(0), { year: 2024, month: 12, date: 1 }),
            ticketingRevenueExcludingTaxes: 250,
            ticketingRevenueIncludingTaxes: 263.75,
            ticketingRevenueTaxRate: null,
            freeTickets: 35,
            paidTickets: 43,
          },
          {
            internalTicketingSystemId: 'e2-2',
            startAt: set(new Date(0), { year: 2024, month: 12, date: 19 }),
            endAt: set(new Date(0), { year: 2024, month: 12, date: 19 }),
            ticketingRevenueExcludingTaxes: 1000,
            ticketingRevenueIncludingTaxes: 1055,
            ticketingRevenueTaxRate: null,
            freeTickets: 86,
            paidTickets: 99,
          },
        ],
      },
    ];
  }
}
