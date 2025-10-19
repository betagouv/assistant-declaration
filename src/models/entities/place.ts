import z from 'zod';

import { AddressInputSchema, AddressSchema } from '@ad/src/models/entities/address';
import { placeAddressRequiredIfAnyNameSpecifiedError, placeNameRequiredIfAnyAddressSpecifiedError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';

export const PlaceSchema = z
  .object({
    id: z.uuid(),
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
  .superRefine((data, ctx) => {
    // Either both are filled or null, but not one of the two only
    if (data.name !== null && data.address === null) {
      ctx.issues.push({
        ...customErrorToZodIssue(placeAddressRequiredIfAnyNameSpecifiedError, {
          overridePath: ['address' satisfies keyof typeof data], // Concatenated to where the `superRefine` is applied
        }),
        input: data,
      });
    } else if (data.name === null && data.address !== null) {
      ctx.issues.push({
        ...customErrorToZodIssue(placeNameRequiredIfAnyAddressSpecifiedError, {
          overridePath: ['name' satisfies keyof typeof data], // Concatenated to where the `superRefine` is applied
        }),
        input: data,
      });
    }
  })
  .strict();
export type PlaceInputSchemaType = z.infer<typeof PlaceInputSchema>;
