import { z } from 'zod';

import { officialIdMustBe9DigitsError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';

export const DeclarationTypeSchema = z.enum(['SACEM', 'SACD']);
export type DeclarationTypeSchemaType = z.infer<typeof DeclarationTypeSchema>;

export const DeclarationStatusSchema = z.enum(['PENDING', 'PROCESSED', 'CANCELED']);
export type DeclarationStatusSchemaType = z.infer<typeof DeclarationStatusSchema>;

export const DeclarationAttachmentTypeSchema = z.enum(['ARTISTIC_CONTRACT', 'PERFORMED_WORK_PROGRAM', 'REVENUE_STATEMENT', 'OTHER']);
export type DeclarationAttachmentTypeSchemaType = z.infer<typeof DeclarationAttachmentTypeSchema>;

export const OfficialIdSchema = z
  .string()
  .min(1)
  .regex(/^\d{9}$/, customErrorToZodIssue(officialIdMustBe9DigitsError));
export type OfficialIdSchemaType = z.infer<typeof OfficialIdSchema>;

export const OfficialHeadquartersIdSchema = z
  .string()
  .min(1)
  .regex(/^\d{14}$/, customErrorToZodIssue(officialIdMustBe9DigitsError));
export type OfficialHeadquartersIdSchemaType = z.infer<typeof OfficialHeadquartersIdSchema>;
