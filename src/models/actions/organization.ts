import { zx } from '@traversable/zod';
import { z } from 'zod';

import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const CreateOrganizationSchema = z.object({
  name: OrganizationSchema.shape.name,
  officialId: OrganizationSchema.shape.officialId,
});
export type CreateOrganizationSchemaType = z.infer<typeof CreateOrganizationSchema>;

export const CreateOrganizationPrefillSchema = zx.deepPartial(CreateOrganizationSchema, 'applyToOutputType');
export type CreateOrganizationPrefillSchemaType = z.infer<typeof CreateOrganizationPrefillSchema>;

export const GetOrganizationSchema = z
  .object({
    id: OrganizationSchema.shape.id,
  })
  .strict();
export type GetOrganizationSchemaType = z.infer<typeof GetOrganizationSchema>;

export const GetOrganizationPrefillSchema = zx.deepPartial(GetOrganizationSchema, 'applyToOutputType');
export type GetOrganizationPrefillSchemaType = z.infer<typeof GetOrganizationPrefillSchema>;
