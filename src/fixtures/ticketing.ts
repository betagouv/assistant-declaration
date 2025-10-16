import { TicketingSystemNameSchema, TicketingSystemSchema, TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';

export const ticketingSystems: TicketingSystemSchemaType[] = [
  TicketingSystemSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    organizationId: 'f79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: TicketingSystemNameSchema.enum.BILLETWEB,
    lastSynchronizationAt: new Date('December 19, 2024 9:00:00 UTC'),
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
    deletedAt: null,
  }),
  TicketingSystemSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e02',
    organizationId: 'f79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: TicketingSystemNameSchema.enum.BILLETWEB,
    lastSynchronizationAt: null,
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
    deletedAt: null,
  }),
  TicketingSystemSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e03',
    organizationId: 'f79cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: TicketingSystemNameSchema.enum.BILLETWEB,
    lastSynchronizationAt: new Date('December 15, 2024 22:00:00 UTC'),
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
    deletedAt: new Date('December 22, 2024 04:33:00 UTC'),
  }),
];
