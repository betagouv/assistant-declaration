import z from 'zod';

import { OfficialHeadquartersIdSchema, OfficialIdSchema } from '@ad/src/models/entities/common';
import { officialIdMustBe9DigitsError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const SacemIdSchema = z
  .string()
  .min(1)
  .regex(/^\d{1,10}$/, customErrorToZodIssue(officialIdMustBe9DigitsError));
export type SacemIdSchemaType = z.infer<typeof SacemIdSchema>;

export const SacdIdSchema = z
  .string()
  .min(1)
  .regex(/^\d{1,10}$/, customErrorToZodIssue(officialIdMustBe9DigitsError));
export type SacdIdSchemaType = z.infer<typeof SacdIdSchema>;

export const StricterOrganizationSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  officialId: OfficialIdSchema,
  officialHeadquartersId: OfficialHeadquartersIdSchema,
  headquartersAddressId: z.uuid(),
  sacemId: SacemIdSchema,
  sacdId: SacdIdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const OrganizationSchema = applyTypedParsers(
  StricterOrganizationSchema.extend({
    sacemId: StricterOrganizationSchema.shape.sacemId.nullable(),
    sacdId: StricterOrganizationSchema.shape.sacdId.nullable(),
  }).strict()
);
export type OrganizationSchemaType = z.infer<typeof OrganizationSchema>;
