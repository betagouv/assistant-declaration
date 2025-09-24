import { DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import {
  EventSchema,
  EventSchemaType,
  EventSerieSchema,
  EventSerieSchemaType,
  EventSerieWrapperSchema,
  EventSerieWrapperSchemaType,
  EventWrapperSchema,
  EventWrapperSchemaType,
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
        transmittedAt: null,
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
        transmittedAt: new Date('December 31, 2024 10:00:00 UTC'),
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

export const eventsWrappers: EventWrapperSchemaType[] = [
  EventWrapperSchema.parse({
    event: events[0],
  }),
  EventWrapperSchema.parse({
    event: events[1],
  }),
  EventWrapperSchema.parse({
    event: events[2],
  }),
];
