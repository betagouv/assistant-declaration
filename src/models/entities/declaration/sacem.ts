import { z } from 'zod';

import { EventSerieSchema } from '@ad/src/models/entities/event';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const SacemDeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: EventSerieSchema.shape.id,
      // TODO:
      // TODO: should extend from base to be sure having the right format
      // TODO:
    })
    .strict()
);
export type SacemDeclarationSchemaType = z.infer<typeof SacemDeclarationSchema>;
