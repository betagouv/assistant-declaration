import { z } from 'zod';

import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const GetOrganizationSchema = z
  .object({
    id: OrganizationSchema.shape.id,
  })
  .strict();
export type GetOrganizationSchemaType = z.infer<typeof GetOrganizationSchema>;

export const GetOrganizationPrefillSchema = GetOrganizationSchema.deepPartial();
export type GetOrganizationPrefillSchemaType = z.infer<typeof GetOrganizationPrefillSchema>;
