import z from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

export const OrganizationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      officialId: z.string().min(1),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type OrganizationSchemaType = z.infer<typeof OrganizationSchema>;
