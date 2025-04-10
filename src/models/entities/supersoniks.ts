import { z } from 'zod';

import { transformStringOrNull, transformTimestampOrNull } from '@ad/src/utils/validation';
import { applyTypedParsers } from '@ad/src/utils/zod';

//
// [WARNING]
// We commented out the majority of properties because the remote API is returning sometimes unexpected values
// and it's really hard to handle all cases since there is not a clear documentation to anticipate them.
//
// This is the best way to make the production not breaking for unused fields during validation.
//

export const JsonPriceSchema = applyTypedParsers(
  z.object({
    // [IMPORTANT] We accept a negative amount/revenue since Supersoniks allows partial reimbursement, see details into the controller logic
    amount: z.number(),
    quantity: z.number().int().nonnegative(),
    revenue: z.number(),
    title: z.string().min(1),
  })
);
export type JsonPriceSchemaType = z.infer<typeof JsonPriceSchema>;

export const JsonStatementSchema = applyTypedParsers(
  z
    .object({
      session: z.object({
        start_date: z.number().int().positive(),
        end_date: z.number().int().nonnegative().transform(transformTimestampOrNull),
        time_zone: z.string().min(1), // Format "Europe/Paris"
        // labels: z.array(z.unknown()),
        // categories: z.array(z.unknown()),
        // activities: z.array(
        //   z.object({
        //     title: z.string().min(1),
        //     id: z.number().int().nonnegative(),
        //     name: z.string().min(1),
        //   })
        // ),
        multisession: z
          .object({
            id: z.number().int().nonnegative(),
            multisession_id: z.number().int().nonnegative(),
            title: z.string().min(1),
            // body: z.string().transform(transformStringOrNull),
            // edito: z.object({
            //   over_title: z.string().transform(transformStringOrNull),
            //   title: z.string().min(1),
            //   alt_title: z.string().transform(transformStringOrNull),
            //   sub_title: z.string().transform(transformStringOrNull),
            //   body: z.string().transform(transformStringOrNull),
            // }),
            // picture: z.object({
            //   fid: z.number().int().nonnegative(),
            //   url: z.string().url(),
            //   src: z.string().url(),
            //   ratio_1x1_120: z.string().url(),
            //   ratio_1x1_360: z.string().url(),
            //   ratio_1x1_640: z.string().url(),
            //   ratio_1x1_1000: z.string().url(),
            //   ratio_1x1_1920: z.string().url(),
            // }),
            // site_link: z.string().transform(transformStringOrNull),
            // display: z.literal('default'),
          })
          .optional(),
        // range: z.object({
        //   id: z.number().int().nonnegative(),
        //   title: z.string().min(1),
        //   display: z.boolean(),
        //   range_id: z.number().int().nonnegative(),
        //   range_name: z.string().min(1),
        //   range_display: z.boolean(),
        // }),
        // producers: z.array(
        //   z.object({
        //     producer_id: z.number().int().nonnegative(),
        //     producer_name: z.string().min(1),
        //     producer_number: z.string().min(1),
        //     id: z.number().int().nonnegative(),
        //     title: z.string().min(1),
        //     number: z.string().min(1),
        //   })
        // ),
        settings: z.object({
          // synchro_site: z.boolean(),
          // revenue_target: z.unknown().nullable(),
          // price_auth: z.boolean(),
          tax: z.object({
            id: z.number().int().nonnegative(),
            title: z.string().min(1),
            rate: z.number().nonnegative(),
            tax_id: z.number().int().nonnegative(),
            tax_name: z.string().min(1),
            tax_value: z.number().nonnegative(),
          }),
          // archiving_date: z.number().int().nonnegative(),
          // max_places_nb: z.number().int().nonnegative(),
          // nominative_ticket: z.boolean(),
          // sale_end_date: z.number().int().nonnegative().transform(transformTimestampOrNull),
          // sale_start_date: z.number().int().nonnegative().transform(transformTimestampOrNull),
          // pass: z.object({
          //   is_pass: z.boolean(),
          //   is_countermarked: z.boolean(),
          //   pass_ids: z.array(z.unknown()),
          // }),
          // reelax_info: z.unknown().nullable(),
          // refund: z.object({
          //   display_setting_status: z.boolean(),
          //   display_url: z.boolean(),
          //   enabled: z.boolean(),
          // }),
          // site_link: z.string().transform(transformStringOrNull),
          // carpooling: z.object({
          //   enabled: z.boolean(),
          // }),
          // pass_culture: z.unknown().nullable(),
          // message: z.string().transform(transformStringOrNull),
          duration: z.number().int().nonnegative().nullable(),
          time_zone: z.string().min(1), // Format "Europe/Paris"
          closing_date: z.number().int().nonnegative().transform(transformTimestampOrNull),
          // gauge: z.unknown().nullable(),
          // internal_quota: z.unknown().nullable(),
          // publication: z.string().min(1),
          // schedule: z.array(z.unknown()),
          // openagenda: z.unknown().nullable(),
          // waiting_list: z.object({
          //   enabled: z.boolean(),
          // }),
        }),
        // location: z.object({
        //   id: z.number().int().nonnegative(),
        //   title: z.string().min(1),
        //   address: z.string().min(1),
        //   city: z.string().min(1),
        //   postal_code: z.string().min(1),
        //   location_id: z.number().int().nonnegative(),
        //   location_name: z.string().min(1),
        //   location_city_name: z.string().min(1),
        //   location_postal_code: z.string().min(1),
        //   location_address: z.string().min(1),
        // }),
        // room: z.object({
        //   id: z.number().int().nonnegative(),
        //   title: z.string().min(1),
        //   display_name: z.boolean(),
        //   display_city: z.boolean(),
        //   placing_type_key: z.string().min(1),
        //   placing_type_label: z.string().min(1),
        //   free_placing_add_on_key: z.string().min(1),
        //   free_placing_add_on_label: z.string().min(1),
        //   room_id: z.number().int().nonnegative(),
        //   room_name: z.string().min(1),
        //   room_display_name: z.boolean(),
        //   room_display_city: z.boolean(),
        //   room_placing_type_key: z.string().min(1),
        //   room_placing_type_label: z.string().min(1),
        //   room_free_placing_add_on_key: z.string().min(1),
        //   room_free_placing_add_on_label: z.string().min(1),
        // }),
        // public_link: z.string().url(),
        id: z.number().int().nonnegative(),
        edito: z.object({
          // over_title: z.string().transform(transformStringOrNull),
          title: z.string().min(1),
          // alt_title: z.string().transform(transformStringOrNull),
          // sub_title: z.string().transform(transformStringOrNull),
          // body: z.string().transform(transformStringOrNull),
        }),
        // slug: z.string().min(1),
        // season: z.object({
        //   id: z.number().int().nonnegative(),
        //   title: z.string().min(1),
        //   current: z.boolean(),
        //   season_id: z.number().int().nonnegative(),
        //   season_name: z.string().min(1),
        //   start_date: z.number().int().positive(),
        //   end_date: z.number().int().positive(),
        //   subscription_sales: z.object({
        //     start_date: z.number().int().nonnegative().transform(transformTimestampOrNull),
        //     end_date: z.number().int().nonnegative().transform(transformTimestampOrNull),
        //   }),
        // }),
        entity_type: z.literal('event').or(z.string().min(1)),
      }),
      revenue: z.number().nonnegative(),
      tax_amount: z.number().nonnegative(),
      sold: z.number().int().nonnegative(),
      gauge: z.number().int().nonnegative(),
      // internal_quota: z.number().int().nonnegative(),
      // peak_attendance: z.number().int().nonnegative(),
      // no_show: z.number().int().nonnegative(),
      // checked: z.number().int().nonnegative(),
      closing_date: z.number().int().nonnegative().transform(transformTimestampOrNull),
      // average_amount: z.number().nonnegative(),
      prices: z.array(z.unknown()),
      externals_prices: z.array(JsonPriceSchema),
      internals_prices: z.array(JsonPriceSchema),
    })
    .strip()
);
export type JsonStatementSchemaType = z.infer<typeof JsonStatementSchema>;

export const JsonCollectionSchema = applyTypedParsers(
  z.object({
    messages: z.array(z.unknown()),
    success: z.boolean(),
    total: z.number().int().nonnegative(),
  })
);
export type JsonCollectionSchemaType = z.infer<typeof JsonCollectionSchema>;

export const JsonGetClosingStatementsResponseSchema = JsonCollectionSchema.extend({
  data: z.array(JsonStatementSchema),
});
export type JsonGetClosingStatementsResponseSchemaType = z.infer<typeof JsonGetClosingStatementsResponseSchema>;
