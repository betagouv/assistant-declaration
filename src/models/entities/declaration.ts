import { z } from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

export const DeclarationTypeSchema = z.enum(['SACEM']);
export type DeclarationTypeSchemaType = z.infer<typeof DeclarationTypeSchema>;

export const DeclarationStatusSchema = z.enum(['PENDING', 'PROCESSED', 'CANCELED']);
export type DeclarationStatusSchemaType = z.infer<typeof DeclarationStatusSchema>;

export const DeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: z.string().uuid(),
    })
    .strict()
);
export type DeclarationSchemaType = z.infer<typeof DeclarationSchema>;
