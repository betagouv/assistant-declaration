import z from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

export const TicketingSystemNameSchema = z.enum(['BILLETWEB', 'MAPADO', 'SECUTIX']);
export type TicketingSystemNameSchemaType = z.infer<typeof TicketingSystemNameSchema>;

export const TicketingSystemSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      organizationId: z.string().uuid(),
      name: TicketingSystemNameSchema,
      lastSynchronizationAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
      deletedAt: z.date().nullable(),
    })
    .strict()
);
export type TicketingSystemSchemaType = z.infer<typeof TicketingSystemSchema>;
