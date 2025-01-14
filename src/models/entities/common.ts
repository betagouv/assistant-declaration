import { z } from 'zod';

export const DeclarationTypeSchema = z.enum(['SACEM']);
export type DeclarationTypeSchemaType = z.infer<typeof DeclarationTypeSchema>;

export const DeclarationStatusSchema = z.enum(['PENDING', 'PROCESSED', 'CANCELED']);
export type DeclarationStatusSchemaType = z.infer<typeof DeclarationStatusSchema>;
