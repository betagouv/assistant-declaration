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

export const JsonOrgaSchema = applyTypedParsers(
  z
    .object({
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
    .strip()
);
export type JsonOrgaSchemaType = z.infer<typeof JsonOrgaSchema>;

export const JsonOrderSchema = applyTypedParsers(
  z
    .object({
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
    .strip()
);
export type JsonOrderSchemaType = z.infer<typeof JsonOrderSchema>;

export const JsonTypeTicketSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      // constraints: z.unknown().nullable(),
      // form: z.object({
      //   id: z.number().int().nonnegative(),
      //   name: z.string().min(1),
      //   nature_ids: z.array(z.number().int().nonnegative()),
      // }),
      ticketing: z.object({
        id: z.number().int().nonnegative(),
        event_id: z.number().int().nonnegative(),
      }),
      category: z.object({
        id: z.number().int().nonnegative(),
        label: z.string().min(1),
      }),
      name: z.string().min(1),
      amount: z.number().nonnegative(),
      is_free: z.boolean(),
      is_active: z.boolean(),
      in_ticketoffice: z.boolean(),
      // identifier: z.string().uuid(),
      vat_rate: z.coerce.number().nonnegative(),
      created_at: z.number().int().nonnegative(),
      updated_at: z.number().int().nonnegative(),
    })
    .strip()
);
export type JsonTypeTicketSchemaType = z.infer<typeof JsonTypeTicketSchema>;

export const JsonEventSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      // has_workshops: z.boolean(),
      // has_products: z.boolean(),
      // has_stages: z.boolean(),
      // is_cooptation: z.boolean(),
      // asso_follow: z.boolean(),
      // count_tickets: z.unknown().nullable(),
      // eventTags: z.array(z.string().min(1)),
      description: z.string().transform(transformStringOrNull),
      // link: z.string().url(),
      // right_user: z.object({
      //   event_seller: z.boolean(),
      //   event_receipt: z.boolean(),
      //   event_refund_manager: z.boolean(),
      //   user_id: z.number().int().nonnegative().nullable(),
      //   is_super_admin:z.boolean(),
      // }),
      // place: z.object({
      //   id: z.number().int().nonnegative(),
      //   name: z.string().min(1),
      //   streets: z.string().min(1),
      //   city: z.string().min(1),
      //   country: z.string().min(1),
      //   zipcode: z.string().min(1),
      //   latitude: z.number().nonnegative(),
      //   longitude: z.number().nonnegative(),
      // }),
      // pictures: z.object({
      //   big: z.string().url(),
      //   cover: z.string().url(),
      //   facebook: z.string().url(),
      // }),
      // type: z.object({
      //   id: z.number().int().nonnegative(),
      //   name: z.string().min(1),
      // }),
      is_draft: z.boolean(),
      is_canceled: z.boolean(),
      // feature_flag: z.object({
      //   has_non_final_exit: z.boolean(),
      //   has_legacy_order: z.boolean(),
      // }),
      is_public: z.boolean(),
      widget_url: z.string().url(),
      // slug: z.string().min(1),
      // orga: JsonOrgaSchema.pick({
      //   id: true,
      //   // followers_count: true,
      //   // license_number: true,
      //   // scanlists: true,
      //   // pictures: true,
      //   // place: true,
      //   // settings: true,
      //   // orga_advice: true,
      //   // has_reporting: true,
      //   // account: true,
      //   // verified_level: true,
      //   // identifier: true,
      //   name: true,
      //   created_at: true,
      //   updated_at: true,
      // }).extend({
      //   following: z.boolean(),
      // }),
      // ticketing: z.object({
      //   id: z.number().int().nonnegative(),
      //   min_amount: z.number().int().nonnegative().nullable(),
      //   is_active: z.boolean(),
      //   settings: z.object({
      //     vat: z.number().nonnegative(),
      //     minutes_lock: z.number().int().nonnegative(),
      //   }),
      //   is_closed: z.boolean(),
      // }),
      is_gray_label: z.boolean(),
      name: z.string().min(1),
      // identifier: z.string().uuid(),
      begin: z.number().int().nonnegative(),
      end: z.number().int().nonnegative(),
      closes_at: z.coerce.date(),
      closed_at: z.unknown().nullable(), // date, but unix or js string
      canceled_at: z.unknown().nullable(), // date, but unix or js string
      published_at: z.unknown().nullable(), // date, but unix or js string
      event_term: z.number().int().nonnegative(),
      access_type: z.string().min(1), // "public" and ???
      // is_sponsored: z.boolean(),
      // is_sponsored_premium: z.boolean(),
      created_at: z.number().int().nonnegative(),
      updated_at: z.number().int().nonnegative(),
      // bill_created_at: z.unknown().nullable(), // date, but unix or js string
      // settings: z.object({
      //   id: z.number().int().nonnegative(),
      //   is_protected_by_password: z.boolean(),
      //   has_payintech: z.boolean(),
      //   has_cashless: z.boolean(),
      //   has_networking: z.boolean(),
      //   has_seating: z.boolean(),
      //   count_exhibit_account_active: z.unknown().nullable(),
      //   count_exhibit_invitation_limit: z.unknown().nullable(),
      //   has_type_ticket_style_advanced: z.boolean(),
      //   has_exhibit_invitation: z.boolean(),
      //   exhibit_invitation_limit: z.unknown().nullable(),
      //   store_workshop_activate: z.boolean(),
      //   has_moderation: z.boolean(),
      //   has_exhibit_scan: z.boolean(),
      //   exhibit_limit: z.unknown().nullable(),
      //   has_exhibit: z.boolean(),
      //   store_classic_activate: z.boolean(),
      // }),
    })
    .strip()
);
export type JsonEventSchemaType = z.infer<typeof JsonEventSchema>;

export const JsonTicketingStatsSchema = applyTypedParsers(
  z
    .object({
      id: z.unknown().nullable(),
      total_ticket: z.number().int().nonnegative(),
      // total_ticket_online: z.number().int().nonnegative(),
      // total_ticket_offline: z.number().int().nonnegative(),
      total_ticket_cancel: z.number().int().nonnegative(),
      // total_invitation: z.number().int().nonnegative(),
      // total_ticketing_online: z.number().int().nonnegative(),
      // total_ticketing_offline: z.number().int().nonnegative(),
      total_ticketing: z.number().nonnegative(),
      // total_store_online: z.number().int().nonnegative(),
      // total_payment_online: z.number().int().nonnegative(),
      // total_payment_offline: z.number().int().nonnegative(),
      total_payment_refund: z.number().int().nonnegative(),
      // total_sell_offline: z.number().int().nonnegative(),
      // total_sell_online: z.number().int().nonnegative(),
      // total_sell: z.number().int().nonnegative(),
      total_com_ticketing: z.number().nonnegative(),
      total_com_store_online: z.number().nonnegative(),
      total_pre_refund: z.number().int().nonnegative(),
      total_com_host: z.number().nonnegative(),
      total_balance_online: z.number().nonnegative(),
      type_tickets: z.array(
        z.object({
          id: z.number().int().nonnegative(),
          name: z.string().min(1),
          amount: z.number().nonnegative(),
          // count_credit_card_without_promo: z.number().int().nonnegative(),
          // count_credit_card_with_promo: z.number().int().nonnegative(),
          // count_paypal_without_promo: z.number().int().nonnegative(),
          // count_paypal_with_promo: z.number().int().nonnegative(),
          // count_credit_card_alt_without_promo: z.number().int().nonnegative(),
          // count_credit_card_alt_with_promo: z.number().int().nonnegative(),
          // count_cheque_without_promo: z.number().int().nonnegative(),
          // count_cheque_with_promo: z.number().int().nonnegative(),
          // count_money_without_promo: z.number().int().nonnegative(),
          // count_money_with_promo: z.number().int().nonnegative(),
          // count_stocks_without_promo: z.number().int().nonnegative(),
          // count_stocks_with_promo: z.number().int().nonnegative(),
          // count_present_without_promo: z.number().int().nonnegative(),
          // count_present_with_promo: z.number().int().nonnegative(),
          // count_ticketoffice_without_promo: z.number().int().nonnegative(),
          // count_ticketoffice_with_promo: z.number().int().nonnegative(),
          count_total: z.number().int().nonnegative(),
          count_total_without_promo: z.number().int().nonnegative(),
          count_total_with_promo: z.number().int().nonnegative(),
          sum_total: z.number().nonnegative(),
          sum_total_online_without_promo: z.number().nonnegative(),
          sum_total_online_with_promo: z.number().nonnegative(),
          sum_total_offline_without_promo: z.number().int().nonnegative(),
          sum_total_offline_with_promo: z.number().nonnegative(),
        })
      ),
    })
    .strip()
);
export type JsonTicketingStatsSchemaType = z.infer<typeof JsonTicketingStatsSchema>;

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
    request_executed: z.number().nonnegative().optional(),
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
  results: z.array(JsonOrgaSchema),
}).strip();
export type JsonListOrganizationsResponseSchemaType = z.infer<typeof JsonListOrganizationsResponseSchema>;

export const JsonListOrdersResponseSchema = JsonCollectionResponseSchema.extend({
  results: z.array(JsonOrderSchema),
}).strip();
export type JsonListOrdersResponseSchemaType = z.infer<typeof JsonListOrdersResponseSchema>;

export const JsonListTypeTicketsResponseSchema = JsonCollectionResponseSchema.extend({
  results: z.array(JsonTypeTicketSchema),
}).strip();
export type JsonListTypeTicketsResponseSchemaType = z.infer<typeof JsonListTypeTicketsResponseSchema>;

export const JsonGetEventResponseSchema = JsonCollectionResponseSchema.extend({
  results: JsonEventSchema,
}).strip();
export type JsonGetEventResponseSchemaType = z.infer<typeof JsonGetEventResponseSchema>;
