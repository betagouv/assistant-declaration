import z from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';

export const PlaceSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    address: AddressSchema,
  })
  .strict();
export type PlaceSchemaType = z.infer<typeof PlaceSchema>;
