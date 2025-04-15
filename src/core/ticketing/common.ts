import { set } from 'date-fns';

import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { TicketingSystemNameSchemaType } from '@ad/src/models/entities/ticketing';
import { sleep } from '@ad/src/utils/sleep';

export const ticketingSystemRequiresApiAccessKey: Record<TicketingSystemNameSchemaType, boolean> = {
  BILLETWEB: true,
  MAPADO: false,
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
