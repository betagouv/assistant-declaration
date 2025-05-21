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

export const JsonAudienceSubcategorySchema = applyTypedParsers(
  z.object({
    id: z.number().int().nonnegative(),
    code: z.string().min(1),
    externalName: JsonTranslatedStringSchema,
    // externalDescription: JsonTranslatedStringSchema,
    audienceCategoryKind: z.enum(['FULL', 'REDUCED', 'FREE']),
    requiredAudienceSubCategoryIds: z.array(z.number().int().nonnegative()),
    crossSeatCategory: z.boolean(),
  })
);
export type JsonAudienceSubcategorySchemaType = z.infer<typeof JsonAudienceSubcategorySchema>;

export const JsonPriceLevelSchema = applyTypedParsers(
  z.object({
    id: z.number().int().nonnegative(),
    code: z.string().min(1),
    mainCategory: z.enum(['OCCASIONAL', 'SUBSCRIBER', 'INSIDE_SEASONTICKET', 'MEMBER', 'INVITED']),
    // reduction: z.number().int().nonnegative(),
  })
);
export type JsonPriceLevelSchemaType = z.infer<typeof JsonPriceLevelSchema>;

export const JsonCompleteProductSchema = applyTypedParsers(
  z.object({
    id: z.number().int().nonnegative(),
    code: z.string().min(1),
    productFamilyType: z.enum(['SINGLE_ENTRY', 'SEASONTICKET', 'PASS', 'PACKAGE', 'MEMBERSHIP', 'SERVICE', 'GOODS', 'TRANSPORT', 'HOSPITALITY']),
    state: z.enum(['PREPARING', 'VALIDATED', 'RUNNING', 'SUSPENDED', 'CANCELED', 'CLOSED', 'CANCELED_CLOSED']),
    vatCodeId: z.number().int().nonnegative().optional(),
    externalName: JsonTranslatedStringSchema,
    event: z
      .object({
        performances: z.array(
          z.object({
            id: z.number().int().nonnegative(),
            // state: z.enum(['PREPARING', 'VALIDATED', 'RUNNING', 'SUSPENDED', 'CANCELED', 'CLOSED', 'CANCELED_CLOSED']), // Existing with the endpoint `getCatalogDetailed` but not with `searchProductsByCriteria`
            start: z.coerce.date(),
            duration: z.number().int().nonnegative().optional(),
            seatCategories: z.array(
              z.object({
                id: z.number().int().nonnegative(),
                code: z.string().min(1),
                externalName: JsonTranslatedStringSchema,
              })
            ),
            prices: z.array(
              z.object({
                seatCatId: z.number().int().nonnegative().optional(),
                audSubCatId: z.number().int().nonnegative(),
                priceLevelId: z.number().int().nonnegative().optional(),
                amount: z.number().int().nonnegative(), // 4000 for 4€
              })
            ),
          })
        ),
      })
      .optional(),
  })
);
export type JsonCompleteProductSchemaType = z.infer<typeof JsonCompleteProductSchema>;

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

export const JsonSearchProductsResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    products: z.array(JsonCompleteProductSchema),
  }).strip()
);
export type JsonSearchProductsResponseSchemaType = z.infer<typeof JsonSearchProductsResponseSchema>;

export const JsonListSeasonsResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    seasons: z.array(
      z.object({
        id: z.number().int().nonnegative(),
        code: z.string().min(1),
        state: z.enum(['PREPARING', 'VALIDATED', 'RUNNING', 'SUSPENDED', 'CANCELED', 'CLOSED', 'CANCELED_CLOSED']),
        start: z.coerce.date(),
        end: z.coerce.date(),
        externalName: JsonTranslatedStringSchema,
        // The endpoint does not filled properties `priceLevels` and `audienceCategories` despite having them, so we have to additional requests (there is no granularity parameter as for products)
      })
    ),
  }).strip()
);
export type JsonListSeasonsResponseSchemaType = z.infer<typeof JsonListSeasonsResponseSchema>;

export const JsonListAudienceSubcategoriesResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    audienceSubCategories: z.array(JsonAudienceSubcategorySchema),
  }).strip()
);
export type JsonListAudienceSubcategoriesResponseSchemaType = z.infer<typeof JsonListAudienceSubcategoriesResponseSchema>;

export const JsonListPriceLevelsResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    priceLevels: z.array(JsonPriceLevelSchema),
  }).strip()
);
export type JsonListPriceLevelsResponseSchemaType = z.infer<typeof JsonListPriceLevelsResponseSchema>;

export const JsonGetPosConfigResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    posConfigData: z.object({
      posId: z.number().int().nonnegative(),
      currencyCode: z.literal('EUR'),
      organizationTimeZone: z.literal('Europe/Paris').or(z.string().min(1)),
    }),
  }).strip()
);
export type JsonGetPosConfigResponseSchemaType = z.infer<typeof JsonGetPosConfigResponseSchema>;

export const JsonGetUpdatedAvailabilitiesResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    availabilityUpdateData: z.array(
      z.object({
        productId: z.number().int().nonnegative(),
        lastUpdate: z.coerce.date(),
      })
    ),
  }).strip()
);
export type JsonGetUpdatedAvailabilitiesResponseSchemaType = z.infer<typeof JsonGetUpdatedAvailabilitiesResponseSchema>;

export const JsonListVatCodesResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    vatCodes: z.array(
      z.object({
        id: z.number().int().nonnegative(),
        code: z.string().min(1),
        currentRate: z.number().int().nonnegative(),
        country: z.literal('FR').or(z.string().min(1)),
      })
    ),
  }).strip()
);
export type JsonListVatCodesResponseSchemaType = z.infer<typeof JsonListVatCodesResponseSchema>;

export const JsonListTicketsByCriteriaResponseSchema = applyTypedParsers(
  JsonSuccessResponseSchema.extend({
    truncated: z.literal(false), // Didn't get the case where it's true but make sure we don't miss anything
    ticketSummaries: z.array(
      z.object({
        ticketState: z.enum(['CANCELLED', 'VALID', 'NOT_PRINTED', 'INVALIDATED']),
        performanceId: z.number().int().nonnegative(),
        seatCategoryId: z.number().int().nonnegative(),
        audienceSubCategoryId: z.number().int().nonnegative(),
        priceLevelId: z.number().int().nonnegative().optional(),
        price: z.number().int().nonnegative(), // 4000 for 4€
      })
    ),
  }).strip()
);
export type JsonListTicketsByCriteriaResponseSchemaType = z.infer<typeof JsonListTicketsByCriteriaResponseSchema>;
