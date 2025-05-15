import { z } from 'zod';

import { emptyStringtoNullPreprocessor, safeCoerceToBoolean, transformStringOrNull } from '@ad/src/utils/validation';
import { applyTypedParsers } from '@ad/src/utils/zod';

//
// [WARNING]
// We commented out the majority of properties because the remote API is returning sometimes unexpected values
// and it's really hard to handle all cases since there is not a clear documentation to anticipate them.
//
// This is the best way to make the production not breaking for unused fields during validation.
//

export const JsonPagingCursorSchema = applyTypedParsers(
  z
    .object({
      href: z.string().url(),
      method: z.literal('GET'),
    })
    .strip()
);
export type JsonPagingCursorSchemaType = z.infer<typeof JsonPagingCursorSchema>;

export const JsonResponseBaseSchema = applyTypedParsers(
  z.object({
    status: z.literal(200).or(z.literal(206)), // 206 due to "partial_content" responses
    error_code: z.literal('success_request').or(z.string().min(1)),
    message: z.literal('OK').or(z.string().min(1)),
    end_request: z.number().nonnegative(),
    server: z.string().min(1),
    results: z.unknown(),
  })
);
export type JsonResponseBaseSchemaType = z.infer<typeof JsonResponseBaseSchema>;

export const JsonLoginResponseSchema = JsonResponseBaseSchema.extend({
  results: z.object({
    access_token: z.string().min(1),
    expires_in: z.number().int().nonnegative(),
    token_type: z.literal('Bearer'),
    scope: z.literal('pro'),
    refresh_token: z.string().min(1),
  }),
}).strip();
export type JsonLoginResponseSchemaType = z.infer<typeof JsonLoginResponseSchema>;

export const JsonCollectionResponseSchema = JsonResponseBaseSchema.extend({
  count: z.number().int().nonnegative(),
  paging: z.object({
    cursors: z.object({
      current: JsonPagingCursorSchema,
      next: JsonPagingCursorSchema.nullable(),
      prev: JsonPagingCursorSchema.nullable(),
    }),
    nb_per_page: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
}).strip();
export type JsonCollectionResponseSchemaType = z.infer<typeof JsonCollectionResponseSchema>;

export const JsonListOrganizationsResponseSchema = JsonCollectionResponseSchema.extend({
  results: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      // followers_count: z.number().int().nonnegative(),
      // license_number: z.string().transform(transformStringOrNull),
      // scanlists: z.unknown().nullable(),
      // pictures: z.object({
      //   big: z.string().url(),
      //   cover: z.string().url(),
      //   facebook: z.string().url(),
      //   original: z.string().url(),
      //   small: z.string().url(),
      // }),
      // place: z.object({
      //   id: z.number().int().nonnegative(),
      //   name: z.string().min(1),
      //   streets: z.string().transform(transformStringOrNull),
      //   city: z.string().min(1),
      //   zipcode: z.string().min(1),
      //   latitude: z.number().nullable(),
      //   longitude: z.number().nullable(),
      // }),
      // settings: z.boolean({
      //   orga_advice: z.string().transform(transformStringOrNull),
      //   has_reporting: z.boolean(),
      // }),
      // account: z.unknown().nullable(),
      // verified_level: z.number().int().nonnegative(),
      // identifier: z.string().uuid(),
      name: z.string().min(1),
      // description: z.string().min(1).nullable(),
      is_public: z.boolean(),
      // facebook_account: z.unknown().nullable(),
      // twitter_account: z.unknown().nullable(),
      created_at: z.number().int().nonnegative(),
      updated_at: z.number().int().nonnegative(),
    })
  ),
}).strip();
export type JsonListOrganizationsResponseSchemaType = z.infer<typeof JsonListOrganizationsResponseSchema>;

export const JsonListOrdersResponseSchema = JsonCollectionResponseSchema.extend({
  results: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      // user_id: z.number().int().nonnegative(),
      tickets: z.array(
        z.object({
          id: z.number().int().nonnegative(),
          // invited_by: z.unknown().nullable(),
          // first_name: z.string().min(1).nullable(),
          // last_name: z.string().min(1).nullable(),
          // seat: z.unknown().nullable(),
          // chip_number: z.unknown().nullable(),
          // checking_informations: z.array(z.unknown()),
          // owner: z.object({
          //   email_address: z.string().transform(transformStringOrNull),
          // }),
          // user_id: z.number().int().nonnegative(),
          status: z.number().int().nonnegative(),
          buy_date: z.number().int().nonnegative(),
          // section: z.unknown().nullable(),
          // row: z.unknown().nullable(),
          // count_checked: z.unknown().nullable(),
          // user: z.unknown().nullable(),
          payment: z.unknown().nullable(),
          // type_ticket: z.unknown().nullable(),
          // event_form: z.unknown().nullable(),
          // ticket_sent: z.boolean(),
          // owner_id: z.number().int().nonnegative().nullable(),
          total: z.number().int().nonnegative(),
          // token: z.string().min(1),
          // identifier: z.string().uuid(),
          // created_at: z.number().int().nonnegative(),
          // updated_at: z.number().int().nonnegative(),
        })
      ),
      promotion: z.unknown().nullable(),
      event: z.object({
        id: z.number().int().nonnegative(),
        // name: z.string().min(1),
      }),
      // origin: z.number().int().nonnegative(),
      // reference: z.string().min(1),
      // type: z.number().int().nonnegative(),
      // products: z.array(z.unknown()),
      // event_form: z.unknown().nullable(),
      // user: z.unknown().nullable(),
      // owner: z.unknown().nullable(),
      // token: z.unknown().nullable(),
      amount: z.number().nonnegative(),
      // identifier: z.string().uuid(),
      // owner_id: z.number().int().nonnegative().nullable(),
      status: z.number().int().nonnegative(),
      // has_insurance: z.boolean(),
      created_at: z.number().int().nonnegative(),
      updated_at: z.number().int().nonnegative(),
    })
  ),
}).strip();
export type JsonListOrdersResponseSchemaType = z.infer<typeof JsonListOrdersResponseSchema>;
