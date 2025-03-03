import { z } from 'zod';

import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const CreateOrganizationSchema = z.object({
  name: OrganizationSchema.shape.name,
  officialId: OrganizationSchema.shape.officialId,
});
export type CreateOrganizationSchemaType = z.infer<typeof CreateOrganizationSchema>;

export const CreateOrganizationPrefillSchema = CreateOrganizationSchema.deepPartial();
export type CreateOrganizationPrefillSchemaType = z.infer<typeof CreateOrganizationPrefillSchema>;

export const GetOrganizationSchema = z
  .object({
    id: OrganizationSchema.shape.id,
  })
  .strict();
export type GetOrganizationSchemaType = z.infer<typeof GetOrganizationSchema>;

export const GetOrganizationPrefillSchema = GetOrganizationSchema.deepPartial();
export type GetOrganizationPrefillSchemaType = z.infer<typeof GetOrganizationPrefillSchema>;
