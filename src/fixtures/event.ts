import { DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import {
  EventCategoryTicketsSchema,
  EventCategoryTicketsSchemaType,
  EventSchema,
  EventSchemaType,
  EventSerieSchema,
  EventSerieSchemaType,
  EventSerieWrapperSchema,
  EventSerieWrapperSchemaType,
  EventWrapperSchema,
  EventWrapperSchemaType,
  TicketCategorySchema,
  TicketCategorySchemaType,
} from '@ad/src/models/entities/event';

export const eventsSeries: EventSerieSchemaType[] = [
  EventSerieSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    internalTicketingSystemId: '29389492',
    ticketingSystemId: 'e79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: 'Le cracheur de feu',
    startAt: new Date('December 1, 2024 10:00:00 UTC'),
    endAt: new Date('December 20, 2024 21:00:00 UTC'),
    taxRate: 0.055,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  EventSerieSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e02',
    internalTicketingSystemId: '49294029',
    ticketingSystemId: 'e79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: 'Il était une fois...',
    startAt: new Date('December 2, 2024 14:00:00 UTC'),
    endAt: new Date('December 2, 2024 15:00:00 UTC'),
    taxRate: 0.055,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  EventSerieSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e03',
    internalTicketingSystemId: '93819240',
    ticketingSystemId: 'e79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: 'Le climat',
    startAt: new Date('December 10, 2024 20:30:00 UTC'),
    endAt: new Date('December 15, 2024 22:00:00 UTC'),
    taxRate: 0.055,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
];

export const eventsSeriesWrappers: EventSerieWrapperSchemaType[] = [
  EventSerieWrapperSchema.parse({
    serie: eventsSeries[0],
    partialDeclarations: [
      {
        type: DeclarationTypeSchema.Values.SACEM,
        status: DeclarationStatusSchema.Values.PROCESSED,
      },
    ],
  }),
  EventSerieWrapperSchema.parse({
    serie: eventsSeries[1],
    partialDeclarations: [],
  }),
  EventSerieWrapperSchema.parse({
    serie: eventsSeries[2],
    partialDeclarations: [
      {
        type: DeclarationTypeSchema.Values.SACEM,
        status: DeclarationStatusSchema.Values.PENDING,
      },
    ],
  }),
];

export const events: EventSchemaType[] = [
  EventSchema.parse({
    id: 'e79cb3ba-745e-5d9a-8903-4a02327a7e01',
    internalTicketingSystemId: '82402934',
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    startAt: new Date('December 1, 2024 10:00:00 UTC'),
    endAt: new Date('December 20, 2024 21:00:00 UTC'),
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  EventSchema.parse({
    id: 'e79cb3ba-745e-5d9a-8903-4a02327a7e02',
    internalTicketingSystemId: '19382193',
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    startAt: new Date('December 2, 2024 14:00:00 UTC'),
    endAt: new Date('December 2, 2024 15:00:00 UTC'),
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  EventSchema.parse({
    id: 'e79cb3ba-745e-5d9a-8903-4a02327a7e03',
    internalTicketingSystemId: '93829128',
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    startAt: new Date('December 10, 2024 20:30:00 UTC'),
    endAt: new Date('December 15, 2024 22:00:00 UTC'),
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
];

export const ticketCategories: TicketCategorySchemaType[] = [
  TicketCategorySchema.parse({
    id: 'a79cb3ba-745e-5d9a-8903-4a02327a7e01',
    internalTicketingSystemId: '21384029',
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: 'Place adulte',
    description: 'Suite à votre achat, vous recevrez par email votre place',
    price: 20,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  TicketCategorySchema.parse({
    id: 'a79cb3ba-745e-5d9a-8903-4a02327a7e02',
    internalTicketingSystemId: '17392938',
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: 'Place enfant',
    description: null,
    price: 5,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  TicketCategorySchema.parse({
    id: 'a79cb3ba-745e-5d9a-8903-4a02327a7e03',
    internalTicketingSystemId: '18372932',
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: 'Adhérent',
    description: 'Tarif réservé aux adhérents de la saison 2024/2025',
    price: 12,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
];

export const eventCategoryTickets: EventCategoryTicketsSchemaType[] = [
  EventCategoryTicketsSchema.parse({
    id: 'f79cb3ba-745e-5d9a-8903-4a02327a7e01',
    eventId: 'e79cb3ba-745e-5d9a-8903-4a02327a7e01',
    categoryId: 'a79cb3ba-745e-5d9a-8903-4a02327a7e01',
    total: 13,
    totalOverride: null,
    priceOverride: 22,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  EventCategoryTicketsSchema.parse({
    id: 'f79cb3ba-745e-5d9a-8903-4a02327a7e02',
    eventId: 'e79cb3ba-745e-5d9a-8903-4a02327a7e01',
    categoryId: 'a79cb3ba-745e-5d9a-8903-4a02327a7e01',
    total: 20,
    totalOverride: 23,
    priceOverride: null,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  EventCategoryTicketsSchema.parse({
    id: 'f79cb3ba-745e-5d9a-8903-4a02327a7e03',
    eventId: 'e79cb3ba-745e-5d9a-8903-4a02327a7e01',
    categoryId: 'a79cb3ba-745e-5d9a-8903-4a02327a7e01',
    total: 32,
    totalOverride: 36,
    priceOverride: null,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
];

export const eventsWrappers: EventWrapperSchemaType[] = [
  EventWrapperSchema.parse({
    event: events[0],
    sales: [
      {
        ticketCategory: ticketCategories[0],
        eventCategoryTickets: eventCategoryTickets[0],
      },
      {
        ticketCategory: ticketCategories[1],
        eventCategoryTickets: eventCategoryTickets[2],
      },
    ],
  }),
  EventWrapperSchema.parse({
    event: events[1],
    sales: [
      {
        ticketCategory: ticketCategories[0],
        eventCategoryTickets: eventCategoryTickets[2],
      },
    ],
  }),
  EventWrapperSchema.parse({
    event: events[2],
    sales: [
      {
        ticketCategory: ticketCategories[0],
        eventCategoryTickets: eventCategoryTickets[0],
      },
      {
        ticketCategory: ticketCategories[1],
        eventCategoryTickets: eventCategoryTickets[1],
      },
      {
        ticketCategory: ticketCategories[2],
        eventCategoryTickets: eventCategoryTickets[2],
      },
    ],
  }),
];
