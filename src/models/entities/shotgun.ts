import { z } from 'zod';

import { transformStringOrNull } from '@ad/src/utils/validation';
import { applyTypedParsers } from '@ad/src/utils/zod';

//
// Below we only focus on properties we need to avoid issues if the rest of the schema evolves
//

export const JsonEventSchema = applyTypedParsers(
  z.object({
    id: z.number().int().nonnegative(),
    name: z.string().min(1),
    // visibility: z.enum(['public', 'private', 'hidden', 'organizer_page']),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    slug: z.string().min(1),
    timezone: z.string().min(1),
    // artists: z.array(
    //   z.object({
    //     id: z.number().int().nonnegative(),
    //     name: z.string().min(1),
    //     slug: z.string().min(1),
    //     avatar: z.url(),
    //     url: z.url(),
    //   })
    // ),
    // genres: z.array(
    //   z.object({
    //     name: z.string().min(1),
    //   })
    // ),
    leftTicketsCount: z.number().int(), // Added `.nonnegative()` at start but for whatever reason it can be `-1`
    // description: z.string().min(1),
    // coverUrl: z.url(),
    // coverThumbnailUrl: z.url(),
    // url: z.url(),
    // addressVisibility: z.enum(['public', 'secret', 'private']),
    // geolocation: z.object({
    //   street: z.string().min(1),
    //   venue: z.string().min(1),
    //   latitude: z.number(),
    //   longitude: z.number(),
    //   city: z.string().min(1),
    //   cityId: z.number().int().nonnegative(),
    //   area: z.string().min(1),
    //   areaId: z.number().int().nonnegative(),
    //   zipCode: z.string().min(1),
    //   country: z.string().min(1),
    //   countryIsoCode: z.string().min(1),
    //   countryId: z.number().int().nonnegative(),
    // }),
    // publishedAt: z.coerce.date(),
    // launchedAt: z.coerce.date(),
    cancelledAt: z.coerce.date().nullable(),
    // organizer: z.object({
    //   name: z.string().min(1),
    //   slug: z.string().min(1),
    // }),
    deals: z.array(
      z.object({
        name: z.string().min(1),
        product_id: z.number().int().nonnegative(),
        description: z.string().min(1).nullable(),
        quantity: z.number().int().nonnegative(),
        // target: z.enum(['online', 'pass_culture']),
        subcategory_id: z.number().int().nonnegative().nullable(),
        subcategory: z
          .object({
            id: z.number().int().nonnegative(),
            name: z.string().min(1),
            start_time: z.coerce.date().nullable(),
          })
          .nullable(),
        // visibilities: z.array(z.string().min(1)),
        price: z.number().nonnegative(), // Float
        organizer_fees: z.number().nonnegative(), // Float
        user_fees: z.number().nonnegative(), // Float
        // sales_channel: z.enum(['online', 'pass_culture']),
      })
    ),
    // isFestival: z.boolean(),
    // typeOfPlace: z.unknown(),
  })
);
export type JsonEventSchemaType = z.infer<typeof JsonEventSchema>;

export const JsonTicketSchema = applyTypedParsers(
  z.object({
    order_id: z.number().int().nonnegative(),
    currency: z.literal('eur'),
    // payment_method: 'card',
    // utm_source: 'direct',
    // utm_medium: 'website',
    product_id: z.number().int().nonnegative(),
    ordered_at: z.coerce.date(),
    event_id: z.number().int().nonnegative(),
    event_name: z.string().min(1),
    event_start_time: z.coerce.date(),
    event_end_time: z.coerce.date(),
    // event_cancellation_date: z.coerce.date().nullable(),
    // event_on_sale_date: z.coerce.date(),
    // event_creation_date: z.coerce.date(),
    // event_publication_date: z.coerce.date(),
    // event_launch_date: z.coerce.date(),
    // buyer_email: z.email(),
    // buyer_first_name: z.string().min(1),
    // buyer_last_name: z.string().min(1),
    // buyer_gender: z.enum(['male', 'female']),
    // buyer_newsletter_optin: z.boolean(),
    // buyer_company_name: z.string().transform(transformStringOrNull),
    // buyer_birthday: z.string().min(1),
    // buyer_zip_code: z.string().min(1),
    // buyer_city: z.string().min(1),
    // buyer_country: z.string().min(1),
    ticket_id: z.number().int().nonnegative(),
    // ticket_barcode: z.string().min(1),
    ticket_redeemed_at: z.coerce.date().nullable(),
    shotguner_id: z.number().int().nonnegative().nullable(),
    cancelled_at: z.coerce.date().nullable(),
    ticket_updated_at: z.coerce.date(),
    ticket_visibilities: z.unknown(),
    ticket_price: z.number().nonnegative(), // Float
    ticket_title: z.string().min(1),
    // channel: z.enum(['online']),
    service_fee: z.number().nonnegative(), // Float
    user_service_fee: z.number().nonnegative(), // Float
    producer_margin: z.number().nonnegative().optional(), // Float
    producer_margin_on_user_service_fee: z.number().nonnegative().optional(), // Float
    vat_rate: z.number().nonnegative(), // 0.055 for 5.5%
    ticket_sub_category: z.unknown().nullable(),
    ticket_status: z.enum(['valid', 'resold', 'refunded', 'canceled', 'pending_organizer_approval', 'rejected', 'payment_plan_pending']),
    // sales_status: z.enum(['OnSale', 'Scheduled', 'SoldOut', 'Stopped']),
  })
);
export type JsonTicketSchemaType = z.infer<typeof JsonTicketSchema>;

export const JsonListEventsResponseSchema = applyTypedParsers(
  z
    .object({
      data: z.array(JsonEventSchema),
    })
    .strip()
);
export type JsonListEventsResponseSchemaType = z.infer<typeof JsonListEventsResponseSchema>;

export const JsonListTicketsResponseSchema = applyTypedParsers(
  z
    .object({
      query: z.record(z.string(), z.unknown()),
      pagination: z.object({
        next: z.url().nullable(),
      }),
      data: z.array(JsonTicketSchema),
    })
    .strip()
);
export type JsonListTicketsResponseSchemaType = z.infer<typeof JsonListTicketsResponseSchema>;
