import z from 'zod';

import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const SynchronizeDataFromTicketingSystemsSchema = z
  .object({
    organizationId: OrganizationSchema.shape.id,
  })
  .strict();
export type SynchronizeDataFromTicketingSystemsSchemaType = z.infer<typeof SynchronizeDataFromTicketingSystemsSchema>;

export const SynchronizeDataFromTicketingSystemsPrefillSchema = SynchronizeDataFromTicketingSystemsSchema.deepPartial();
export type SynchronizeDataFromTicketingSystemsPrefillSchemaType = z.infer<typeof SynchronizeDataFromTicketingSystemsPrefillSchema>;
