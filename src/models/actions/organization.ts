import { z } from 'zod';

import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const CreateOrganizationSchema = z.object({
  name: OrganizationSchema.shape.name,
  officialHeadquartersId: OrganizationSchema.shape.officialHeadquartersId,
});
export type CreateOrganizationSchemaType = z.infer<typeof CreateOrganizationSchema>;

export const CreateOrganizationPrefillSchema = CreateOrganizationSchema.partial();
export type CreateOrganizationPrefillSchemaType = z.infer<typeof CreateOrganizationPrefillSchema>;

export const GetOrganizationSchema = z
  .object({
    id: OrganizationSchema.shape.id,
  })
  .strict();
export type GetOrganizationSchemaType = z.infer<typeof GetOrganizationSchema>;

export const GetOrganizationPrefillSchema = GetOrganizationSchema.partial();
export type GetOrganizationPrefillSchemaType = z.infer<typeof GetOrganizationPrefillSchema>;
