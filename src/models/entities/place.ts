import z from 'zod';

import { AddressInputSchema, AddressSchema } from '@ad/src/models/entities/address';

export const PlaceSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    address: AddressSchema,
  })
  .strict();
export type PlaceSchemaType = z.infer<typeof PlaceSchema>;

export const PlaceInputSchema = z
  .object({
    name: PlaceSchema.shape.name.nullable(),
    address: AddressInputSchema.nullable(),
  })
  .strict();
export type PlaceInputSchemaType = z.infer<typeof PlaceInputSchema>;
