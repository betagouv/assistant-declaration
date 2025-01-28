import { z } from 'zod';

import { emptyStringtoNullPreprocessor, safeCoerceToBoolean, transformStringOrNull } from '@ad/src/utils/validation';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const JsonEventOccurenceSchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      start: z.coerce.date(),
      end: z.coerce.date(),
      name: z.string().transform(transformStringOrNull),
      place: z.string().transform(transformStringOrNull),
      description: z.string().transform(transformStringOrNull),
      instructions: z.string().transform(transformStringOrNull),
      disabled: z.unknown(), // Integer enum
      last_update: z.preprocess((value) => {
        // Some old entries do not have this field initialized (dated ~2018)
        return value === '0000-00-00 00:00:00' ? null : value;
      }, z.coerce.date().nullable()),
      quota: z.coerce.number().nonnegative(),
      total_sales: z.coerce.number().nonnegative(),
      tickets: z.record(z.string().min(1), z.string().min(1)),
    })
    .strip()
);
export type JsonEventOccurenceSchemaType = z.infer<typeof JsonEventOccurenceSchema>;

export const JsonEventSchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      ext_id: z.string().min(1),
      name: z.string().min(1),
      start: z.preprocess((value) => {
        // Some old entries do not have this field initialized (dated ~2018)
        return value === '0000-00-00 00:00:00' ? null : value;
      }, z.coerce.date().nullable()),
      end: z.preprocess((value) => {
        // Some old entries do not have this field initialized (dated ~2018)
        return value === '0000-00-00 00:00:00' ? null : value;
      }, z.coerce.date().nullable()),
      multiple: safeCoerceToBoolean(z.boolean()),
      place: z.string().transform(transformStringOrNull),
      shop: z.string().url(),
      tax_rate: z.coerce.number(),
      online: safeCoerceToBoolean(z.boolean()),
      tags: z.preprocess(
        (value) => {
          // For whatever reason a tag may be empty... probably due to their default HTML form
          // So skipping them
          if (Array.isArray(value)) {
            return value.filter((item) => item !== '');
          }

          return value;
        },
        z.array(z.string().min(1))
      ),
      image: emptyStringtoNullPreprocessor(z.string().url().nullable()),
      cover: emptyStringtoNullPreprocessor(z.string().url().nullable()),
      confirmation_message: z.string().transform(transformStringOrNull),
    })
    .strip()
);
export type JsonEventSchemaType = z.infer<typeof JsonEventSchema>;

export const JsonTicketCategorySchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      full_name: z.string().min(1),
      name: z.string().min(1),
      price: z.number().nonnegative(),
      category: z.string().transform(transformStringOrNull),
      description: z.string().transform(transformStringOrNull),
      quota: z.coerce.number(),
      label: z.string().transform(transformStringOrNull),
      visibility: z.unknown(), // Integer enum
      instructions: z.string().transform(transformStringOrNull),
      start_time: z.preprocess((value) => {
        // Don't understand why?
        return value === '' ? null : value;
      }, z.coerce.date().nullable()),
      end_time: z.preprocess((value) => {
        // Don't understand why?
        return value === '' ? null : value;
      }, z.coerce.date().nullable()),
      form: z.string().min(1),
      tax: z.string().transform(transformStringOrNull),
      commission: z.number().nonnegative().or(z.literal(false)),
    })
    .strip()
);
export type JsonTicketCategorySchemaType = z.infer<typeof JsonTicketCategorySchema>;

export const JsonEventAttendeeSchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      ext_id: z.string().min(1),
      barcode: z.string().min(1),
      used: z.unknown(), // Integer enum
      lane: z.string().transform(transformStringOrNull),
      used_date: z.preprocess((value) => {
        // It's used as a placeholder when `used` is false
        return value === '0000-00-00 00:00:00' ? null : value;
      }, z.coerce.date().nullable()),
      email: z.string().transform(transformStringOrNull),
      firstname: z.string().transform(transformStringOrNull),
      name: z.string().transform(transformStringOrNull),
      ticket: z.string().min(1), // Enum? "Plein"...
      category: z.string().transform(transformStringOrNull),
      ticket_id: z.string().min(1),
      price: z.coerce.number(),
      seating_location: z.string().transform(transformStringOrNull),
      last_update: z.coerce.date(),
      reduction_code: z.string().transform(transformStringOrNull),
      authorization_code: z.string().transform(transformStringOrNull),
      pass: z.unknown(), // Can be "0" or "428942988"...
      disabled: z.unknown(), // Integer enum
      product_management: z.string().url(),
      product_download: z.string().url(),
      order_id: z.string().min(1),
      order_ext_id: z.string().min(1),
      order_firstname: z.string().transform(transformStringOrNull),
      order_name: z.string().transform(transformStringOrNull),
      order_email: z.string().transform(transformStringOrNull),
      order_date: z.coerce.date(),
      order_paid: safeCoerceToBoolean(z.boolean()),
      order_payment_type: z.string().min(1), // Enum? "web"...
      order_origin: z.string().min(1), // Enum? "web"...
      order_price: z.coerce.number(),
      order_session: z.string().min(1),
      session_start: z.preprocess((value) => {
        // Don't understand why?
        return value === '' ? null : value;
      }, z.coerce.date().nullable()),
      order_accreditation: z.unknown(), // Integer enum
      order_management: z.string().url(),
      order_language: z.string().transform(transformStringOrNull),
      custom_order: z.record(z.string().min(1), z.unknown()).optional(),
    })
    .strip()
);
export type JsonEventAttendeeSchemaType = z.infer<typeof JsonEventAttendeeSchema>;

export const JsonAttendeeSchema = applyTypedParsers(
  JsonEventAttendeeSchema.extend({
    event: z.string().min(1),
    event_name: z.string().min(1),
    event_start: z.coerce.date(),
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
