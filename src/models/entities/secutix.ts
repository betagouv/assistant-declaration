import { z } from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

//
// [WARNING]
// We commented out the majority of properties because the remote API is returning sometimes unexpected values
// and it's really hard to handle all cases since there is not a clear documentation to anticipate them.
//
// This is the best way to make the production not breaking for unused fields during validation.
//

export const JsonAuthResponseSchema = applyTypedParsers(
  z.object({
    token: z.string().min(1),
  })
);
export type JsonAuthResponseSchemaType = z.infer<typeof JsonAuthResponseSchema>;
