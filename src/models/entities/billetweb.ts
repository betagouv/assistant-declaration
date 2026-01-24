import { fromZonedTime } from 'date-fns-tz';
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

function transformBilletwebDate(value: Date): Date {
  // Converts to UTC Date since Billetweb always transmit in the french timezone
  return fromZonedTime(value, 'Europe/Paris');
}

// Not able to use signature overload of implementation inside `.transform()`, maybe a zod error
function transformBilletwebDateOrNull(value: Date | null): Date | null {
  return value ? transformBilletwebDate(value) : null;
}

export const JsonEventOccurenceSchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      start: z.coerce.date().transform(transformBilletwebDate),
      end: z.coerce.date().transform(transformBilletwebDate),
      // name: z.string().transform(transformStringOrNull),
      // place: z.string().transform(transformStringOrNull),
      // description: z.string().transform(transformStringOrNull),
      // instructions: z.string().transform(transformStringOrNull),
      // disabled: z.unknown(), // Integer enum
      // last_update: z.preprocess((value) => {
      //   // Some old entries do not have this field initialized (dated ~2018)
      //   return value === '0000-00-00 00:00:00' ? null : value;
      // }, z.coerce.date().nullable().transform(transformBilletwebDateOrNull)),
      // quota: z.coerce.number().nonnegative(),
      // total_sales: z.coerce.number().nonnegative(),
      // tickets: z.record(z.string().min(1), z.string().min(1)),
    })
    .strip()
);
export type JsonEventOccurenceSchemaType = z.infer<typeof JsonEventOccurenceSchema>;

export const JsonEventSchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      // ext_id: z.string().min(1),
      name: z.string().min(1),
      start: z.preprocess((value) => {
        // Some old entries do not have this field initialized (dated ~2018)
        return value === '0000-00-00 00:00:00' ? null : value;
      }, z.coerce.date().nullable().transform(transformBilletwebDateOrNull)),
      end: z.preprocess((value) => {
        // Some old entries do not have this field initialized (dated ~2018)
        return value === '0000-00-00 00:00:00' ? null : value;
      }, z.coerce.date().nullable().transform(transformBilletwebDateOrNull)),
      multiple: safeCoerceToBoolean(z.boolean()),
      // place: z.string().transform(transformStringOrNull),
      // shop: z.url(),
      tax_rate: z.coerce.number(),
      // online: safeCoerceToBoolean(z.boolean()),
      // tags: z.preprocess(
      //   (value) => {
      //     // For whatever reason a tag may be empty... probably due to their default HTML form
      //     // So skipping them
      //     if (Array.isArray(value)) {
      //       return value.filter((item) => item !== '');
      //     }

      //     return value;
      //   },
      //   z.array(z.string().min(1))
      // ),
      // image: emptyStringtoNullPreprocessor(z.url().nullable()),
      // cover: emptyStringtoNullPreprocessor(z.url().nullable()),
      // confirmation_message: z.string().transform(transformStringOrNull),
    })
    .strip()
);
export type JsonEventSchemaType = z.infer<typeof JsonEventSchema>;

export const JsonTicketCategorySchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      // full_name: z.string().min(1),
      name: z.string().min(1),
      price: z.number().nonnegative(),
      // category: z.string().transform(transformStringOrNull),
      description: z.string().transform(transformStringOrNull),
      // quota: z.coerce.number(),
      // label: z.string().transform(transformStringOrNull),
      // visibility: z.unknown(), // Integer enum
      // instructions: z.string().transform(transformStringOrNull),
      // start_time: z.preprocess((value) => {
      //   // Don't understand why?
      //   return value === '' ? null : value;
      // }, z.coerce.date().nullable().transform(transformBilletwebDateOrNull)),
      // end_time: z.preprocess((value) => {
      //   // Don't understand why?
      //   return value === '' ? null : value;
      // }, z.coerce.date().nullable().transform(transformBilletwebDateOrNull)),
      // form: z.string().min(1),
      tax: emptyStringtoNullPreprocessor(z.coerce.number().nullable()),
      commission: z.number().nonnegative().or(z.literal(false)),
    })
    .strip()
);
export type JsonTicketCategorySchemaType = z.infer<typeof JsonTicketCategorySchema>;

export const JsonEventAttendeeSchema = applyTypedParsers(
  z
    .object({
      // id: z.string().min(1),
      // ext_id: z.string().min(1),
      // barcode: z.string().min(1),
      // used: z.unknown(), // Integer enum
      // lane: z.string().transform(transformStringOrNull),
      // used_date: z.preprocess((value) => {
      //   // It's used as a placeholder when `used` is false
      //   return value === '0000-00-00 00:00:00' ? null : value;
      // }, z.coerce.date().nullable().transform(transformBilletwebDateOrNull)),
      // email: z.string().transform(transformStringOrNull),
      // firstname: z.string().transform(transformStringOrNull),
      // name: z.string().transform(transformStringOrNull),
      // ticket: z.string().min(1), // Enum? "Plein"...
      // category: z.string().transform(transformStringOrNull),
      ticket_id: z.string().min(1),
      price: z.coerce.number().nonnegative(),
      // seating_location: z.string().transform(transformStringOrNull),
      // last_update: z.coerce.date().transform(transformBilletwebDate),
      // reduction_code: z.string().transform(transformStringOrNull),
      // authorization_code: z.string().transform(transformStringOrNull),
      // pass: z.unknown(), // Can be "0" or "428942988"...
      disabled: safeCoerceToBoolean(z.boolean()), // "1" if refund, "0" otherwise
      // product_management: z.url(),
      // product_download: z.url(),
      // order_id: z.string().min(1),
      // order_ext_id: z.string().min(1),
      // order_firstname: z.string().transform(transformStringOrNull),
      // order_name: z.string().transform(transformStringOrNull),
      // order_email: z.string().transform(transformStringOrNull),
      // order_date: z.coerce.date().transform(transformBilletwebDate),
      // order_paid: safeCoerceToBoolean(z.boolean()),
      // ---
      // order_payment_type: z.enum(['web', 'free', 'invitation', 'reservation', 'cash', 'check', 'card', 'multiple', 'other', '4030', '123xxxx']), // "web" is if ordered from Billetweb services with amount non-zero (cash, check and card supposingly on-premise and other by admins), also "multiple" seems to always have no fee (maybe it cannot be "web+cash" but always combined outside Billetweb platform)
      order_payment_type: z.string(), // Cannot rely on an enum since there are custom payment types that are numerics like 430, 10549... so have to accept string, and we cannot expect it to be non-empty, since we saw a case where it was instead of using "free" for a free ticket
      // ---
      // order_origin: z.string().min(1), // Either "web" or an arbitrary string written by the organization (the place, the season or the role of the originator if admin...)
      // order_price: z.coerce.number(), // The amount contains the total if multiple tickets bought
      order_session: z.string().min(1),
      // session_start: z.preprocess((value) => {
      //   // Don't understand why?
      //   return value === '' ? null : value;
      // }, z.coerce.date().nullable().transform(transformBilletwebDateOrNull)),
      // order_accreditation: z.unknown(), // Integer enum
      // order_management: z.url(),
      // order_language: z.string().transform(transformStringOrNull),
      // custom_order: z.record(z.string().min(1), z.unknown()).optional(),
    })
    .strip()
);
export type JsonEventAttendeeSchemaType = z.infer<typeof JsonEventAttendeeSchema>;

export const JsonAttendeeSchema = applyTypedParsers(
  JsonEventAttendeeSchema.extend({
    event: z.string().min(1),
    // event_name: z.string().min(1),
    // event_start: z.coerce.date().transform(transformBilletwebDate),
  }).strip()
);
export type JsonAttendeeSchemaType = z.infer<typeof JsonAttendeeSchema>;

export const JsonGetEventsResponseSchema = z.array(JsonEventSchema);
export type JsonGetEventsResponseSchemaType = z.infer<typeof JsonGetEventsResponseSchema>;

export const JsonGetEventsOccurencesResponseSchema = z.array(JsonEventOccurenceSchema);
export type JsonGetEventsOccurencesResponseSchemaType = z.infer<typeof JsonGetEventsOccurencesResponseSchema>;

export const JsonGetTicketCategoriesResponseSchema = z.array(JsonTicketCategorySchema);
export type JsonGetTicketCategoriesResponseSchemaType = z.infer<typeof JsonGetTicketCategoriesResponseSchema>;

export const JsonGetEventAttendeesResponseSchema = z.array(JsonEventAttendeeSchema);
export type JsonGetEventAttendeesResponseSchemaType = z.infer<typeof JsonGetEventAttendeesResponseSchema>;

export const JsonGetAttendeesResponseSchema = z.array(JsonAttendeeSchema);
export type JsonGetAttendeesResponseSchemaType = z.infer<typeof JsonGetAttendeesResponseSchema>;
