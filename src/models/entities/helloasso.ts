import { z } from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

export const JsonTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().nonnegative(),
  refresh_token: z.string().min(1),
  token_type: z.literal('bearer'),
  expires_at: z.coerce.date(),
});
export type JsonTokenSchemaType = z.infer<typeof JsonTokenSchema>;
