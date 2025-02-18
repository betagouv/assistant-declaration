import { z } from 'zod';

export const DeclarationTypeSchema = z.enum(['SACEM', 'SACD', 'ASTP', 'CNM']);
export type DeclarationTypeSchemaType = z.infer<typeof DeclarationTypeSchema>;

export const DeclarationStatusSchema = z.enum(['PENDING', 'PROCESSED', 'CANCELED']);
export type DeclarationStatusSchemaType = z.infer<typeof DeclarationStatusSchema>;
