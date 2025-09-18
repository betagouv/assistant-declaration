import z from 'zod';

import { officialIdMustBe9DigitsError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const OrganizationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      officialId: z
        .string()
        .min(1)
        .regex(/^\d{9}$/, customErrorToZodIssue(officialIdMustBe9DigitsError)),
      officialHeadquartersId: z
        .string()
        .min(1)
        .regex(/^\d{14}$/, customErrorToZodIssue(officialIdMustBe9DigitsError)),
      sacemId: z
        .string()
        .min(1)
        .regex(/^\d{1,10}$/, customErrorToZodIssue(officialIdMustBe9DigitsError))
        .nullable(),
      sacdId: z
        .string()
        .min(1)
        .regex(/^\d{1,10}$/, customErrorToZodIssue(officialIdMustBe9DigitsError))
        .nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type OrganizationSchemaType = z.infer<typeof OrganizationSchema>;
