import { addHours, getDayOfYear, getYear, set, subDays } from 'date-fns';

import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { TicketingSystemNameSchemaType } from '@ad/src/models/entities/ticketing';
import { sleep } from '@ad/src/utils/sleep';

export const ticketingSystemRequiresApiAccessKey: Record<TicketingSystemNameSchemaType, boolean> = {
  BILLETWEB: true,
  HELLOASSO: true,
  MANUAL: false,
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

    // Use the today date so each day you can test from on brand new series
    const today = new Date();

    const event1At = subDays(set(today, { hours: 11, minutes: 0, seconds: 0, milliseconds: 0 }), 10);
    const event2At = subDays(set(today, { hours: 14, minutes: 0, seconds: 0, milliseconds: 0 }), 10);
    const event3At = subDays(set(today, { hours: 18, minutes: 0, seconds: 0, milliseconds: 0 }), 10);

    const syncDayIndicationSuffix = `test ${getYear(today)}-${getDayOfYear(today)}`;

    // For now return always the same data to prove differences detection works
    return [
      {
        serie: {
          internalTicketingSystemId: `s1-${getYear(today)}-${getDayOfYear(today)}`,
          name: `Mon premier coucou (${syncDayIndicationSuffix})`,
        },
        events: [
          {
            internalTicketingSystemId: `e1-1-${getYear(today)}-${getDayOfYear(today)}`,
            startAt: event1At,
            endAt: addHours(event1At, 1),
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
          internalTicketingSystemId: `s2-${getYear(today)}-${getDayOfYear(today)}`,
          name: `Un coucou au soleil (${syncDayIndicationSuffix})`,
        },
        events: [
          {
            internalTicketingSystemId: `e2-1-${getYear(today)}-${getDayOfYear(today)}`,
            startAt: event1At,
            endAt: addHours(event2At, 1),
            ticketingRevenueExcludingTaxes: 250,
            ticketingRevenueIncludingTaxes: 263.75,
            ticketingRevenueTaxRate: null,
            freeTickets: 35,
            paidTickets: 43,
          },
          {
            internalTicketingSystemId: `e2-2-${getYear(today)}-${getDayOfYear(today)}`,
            startAt: event1At,
            endAt: addHours(event3At, 2),
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
