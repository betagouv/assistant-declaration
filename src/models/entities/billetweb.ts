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
      disabled: safeCoerceToBoolean(z.boolean()),
      last_update: z.coerce.date(),
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
      start: z.coerce.date(),
      end: z.coerce.date(),
      multiple: safeCoerceToBoolean(z.boolean()),
      place: z.string().min(1),
      shop: z.string().url(),
      tax_rate: z.coerce.number(),
      online: safeCoerceToBoolean(z.boolean()),
      tags: z.array(z.string().min(1)),
      image: z.string().url(),
      cover: z.string().url(),
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
      visibility: safeCoerceToBoolean(z.boolean()),
      instructions: z.string().transform(transformStringOrNull),
      start_time: emptyStringtoNullPreprocessor(z.date().nullable()),
      end_time: emptyStringtoNullPreprocessor(z.date().nullable()),
      form: safeCoerceToBoolean(z.boolean()),
      tax: z.string().transform(transformStringOrNull),
      commission: z.number().nonnegative(),
    })
    .strip()
);
export type JsonTicketCategorySchemaType = z.infer<typeof JsonTicketCategorySchema>;

export const JsonAttendeeSchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      ext_id: z.string().min(1),
      barcode: z.string().min(1),
      used: safeCoerceToBoolean(z.boolean()),
      lane: z.string().transform(transformStringOrNull),
      used_date: z.coerce.date(),
      email: z.string().email(),
      firstname: z.string().min(1),
      name: z.string().min(1),
      ticket: z.string().min(1), // Enum? "Plein"...
      category: z.string().transform(transformStringOrNull),
      ticket_id: z.string().min(1),
      price: z.coerce.number(),
      seating_location: z.string().transform(transformStringOrNull),
      last_update: z.coerce.date(),
      reduction_code: z.string().transform(transformStringOrNull),
      authorization_code: z.string().transform(transformStringOrNull),
      pass: safeCoerceToBoolean(z.boolean()),
      disabled: safeCoerceToBoolean(z.boolean()),
      product_management: z.string().url(),
      product_download: z.string().url(),
      order_id: z.string().min(1),
      order_ext_id: z.string().min(1),
      order_firstname: z.string().min(1),
      order_name: z.string().min(1),
      order_email: z.string().email(),
      order_date: z.coerce.date(),
      order_paid: safeCoerceToBoolean(z.boolean()),
      order_payment_type: z.string().min(1), // Enum? "web"...
      order_origin: z.string().min(1), // Enum? "web"...
      order_price: z.coerce.number(),
      order_session: z.string().min(1),
      session_start: z.coerce.date(),
      order_accreditation: safeCoerceToBoolean(z.boolean()),
      order_management: z.string().url(),
      order_language: z.string().min(1),
      custom_order: z.record(z.string().min(1), z.unknown()),
    })
    .strip()
);
export type JsonAttendeeSchemaType = z.infer<typeof JsonAttendeeSchema>;

export const JsonGetEventsResponseSchema = z.array(JsonEventSchema);
export type JsonGetEventsResponseSchemaType = z.infer<typeof JsonGetEventsResponseSchema>;

export const JsonGetEventsOccurencesResponseSchema = z.array(JsonEventOccurenceSchema);
export type JsonGetEventsOccurencesResponseSchemaType = z.infer<typeof JsonGetEventsOccurencesResponseSchema>;

export const JsonGetTicketCategoriesResponseSchema = z.array(JsonTicketCategorySchema);
export type JsonGetTicketCategoriesResponseSchemaType = z.infer<typeof JsonGetTicketCategoriesResponseSchema>;

export const JsonGetAttendeesResponseSchema = z.array(JsonAttendeeSchema);
export type JsonGetAttendeesResponseSchemaType = z.infer<typeof JsonGetAttendeesResponseSchema>;
