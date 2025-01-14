import z from 'zod';

import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const UserInterfaceOrganizationSchema = applyTypedParsers(
  z
    .object({
      id: OrganizationSchema.shape.id,
      name: OrganizationSchema.shape.name,
      collaboratorId: z.string().uuid(),
    })
    .strict()
);
export type UserInterfaceOrganizationSchemaType = z.infer<typeof UserInterfaceOrganizationSchema>;

export const UserInterfaceSessionSchema = applyTypedParsers(
  z
    .object({
      collaboratorOf: z.array(UserInterfaceOrganizationSchema),
      isAdmin: z.boolean(),
    })
    .strict()
);
export type UserInterfaceSessionSchemaType = z.infer<typeof UserInterfaceSessionSchema>;
