import { z } from 'zod';

import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const DeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: z.string().uuid(),
      status: DeclarationStatusSchema,
      transmittedAt: z.date().nullable(),
    })
    .strict()
);
export type DeclarationSchemaType = z.infer<typeof DeclarationSchema>;
