import { z } from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

//
// [WARNING]
// We commented out the majority of properties because the remote API is returning sometimes unexpected values
// and it's really hard to handle all cases since there is not a clear documentation to anticipate them.
//
// This is the best way to make the production not breaking for unused fields during validation.
//

export const JsonTranslatedStringSchema = applyTypedParsers(
  z.object({
    translations: z.array(
      z.object({
        locale: z.string().min(1),
        value: z.string().min(1),
      })
    ),
  })
);
export type JsonTranslatedStringSchemaType = z.infer<typeof JsonTranslatedStringSchema>;

export const JsonAuthResponseSchema = applyTypedParsers(
  z.object({
    token: z.string().min(1),
  })
);
export type JsonAuthResponseSchemaType = z.infer<typeof JsonAuthResponseSchema>;

export const JsonSuccessResponseSchema = applyTypedParsers(
  z.object({
    statusCode: z.literal('success'),
  })
);
export type JsonSuccessResponseSchemaType = z.infer<typeof JsonSuccessResponseSchema>;

export const JsonIsCatalogServiceAliveResponseSchema = applyTypedParsers(JsonSuccessResponseSchema.extend({}));
export type JsonIsCatalogServiceAliveResponseSchemaType = z.infer<typeof JsonIsCatalogServiceAliveResponseSchema>;

export const JsonGetCatalogDetailedResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    catalogData: z.object({
      seasons: z.array(
        z.object({
          products: z.array(
            z.object({
              id: z.number().int().nonnegative(),
              state: z.enum(['PREPARING', 'VALIDATED', 'RUNNING', 'SUSPENDED', 'CANCELED', 'CLOSED', 'CANCELED_CLOSED']),
              vatCodeId: z.number().int().nonnegative(),
              externalName: JsonTranslatedStringSchema,
              event: z.object({
                performances: z.array(
                  z.object({
                    id: z.number().int().nonnegative(),
                    start: z.coerce.date(),
                    duration: z.number().int().nonnegative().optional(),
                    seatCategories: z.array(
                      z.object({
                        id: z.number().int().nonnegative(),
                        externalName: JsonTranslatedStringSchema,
                      })
                    ),
                  })
                ),
                prices: z.array(
                  z.object({
                    seatCatId: z.number().int().nonnegative(),
                    audSubCatId: z.number().int().nonnegative(),
                    amount: z.number().nonnegative(),
                  })
                ),
              }),
            })
          ),
        })
      ),
    }),
  }).strip()
);
export type JsonGetCatalogDetailedResponseSchemaType = z.infer<typeof JsonGetCatalogDetailedResponseSchema>;
