import z from 'zod';

import { GetterInputSchema } from '@ad/src/models/actions/common';
import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const ListTicketingSystemsSchema = GetterInputSchema.extend({
  filterBy: z.object({
    organizationIds: z.array(OrganizationSchema.shape.id).nullish(),
  }),
}).strict();
export type ListTicketingSystemsSchemaType = z.infer<typeof ListTicketingSystemsSchema>;

export const ListTicketingSystemsPrefillSchema = ListTicketingSystemsSchema.deepPartial();
export type ListTicketingSystemsPrefillSchemaType = z.infer<typeof ListTicketingSystemsPrefillSchema>;
