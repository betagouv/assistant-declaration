import z from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

export const TicketingSystemNameSchema = z.enum(['MANUAL', 'BILLETWEB', 'HELLOASSO', 'MAPADO', 'SHOTGUN', 'SOTICKET', 'SUPERSONIKS']);
export type TicketingSystemNameSchemaType = z.infer<typeof TicketingSystemNameSchema>;

export const RemoteTicketingSystemNameSchema = TicketingSystemNameSchema.exclude(['MANUAL']);
export type RemoteTicketingSystemNameSchemaType = z.infer<typeof RemoteTicketingSystemNameSchema>;

export const TicketingSystemSchema = applyTypedParsers(
  z
    .object({
      id: z.uuid(),
      organizationId: z.uuid(),
      name: TicketingSystemNameSchema,
      lastSynchronizationAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
      deletedAt: z.date().nullable(),
    })
    .strict()
);
export type TicketingSystemSchemaType = z.infer<typeof TicketingSystemSchema>;
