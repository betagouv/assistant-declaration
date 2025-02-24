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

export const JsonRecentTicketSchema = applyTypedParsers(
  z
    .object({
      eventDate: z.object({
        ticketing: z.string().min(1),
      }),
      updatedAt: z.coerce.date(),
    })
    .strip()
);
export type JsonRecentTicketSchemaType = z.infer<typeof JsonRecentTicketSchema>;

export const JsonTicketSchema = applyTypedParsers(
  z
    .object({
      status: z.enum(['payed', 'refunded', 'booked', 'cancelled']),
      ticketPrice: z.string().min(1).nullable(),
      eventDate: z.string().min(1),
      isValid: z.boolean(),
      imported: z.boolean(),
    })
    .strip()
);
export type JsonTicketSchemaType = z.infer<typeof JsonTicketSchema>;

export const JsonTicketingSchema = applyTypedParsers(
  z
    .object({
      '@id': z.string().min(1),
      type: z.enum(['dated_events', 'undated_event', 'offer']),
      title: z.string().min(1),
      currency: z.literal('EUR'),
      eventDateList: z.array(z.string().min(1)),
    })
    .strip()
);
export type JsonTicketingSchemaType = z.infer<typeof JsonTicketingSchema>;

export const JsonEventDateSchema = applyTypedParsers(
  z
    .object({
      '@id': z.string().min(1),
      startDate: z.coerce.date().nullable(),
      endDate: z.coerce.date().nullable(),
      startOfEventDay: z.coerce.date().nullable(),
      endOfEventDay: z.coerce.date().nullable(),
      ticketPriceList: z.array(
        z.object({
          id: z.number().int().nonnegative(),
          type: z.enum([
            'default',
            'full_price',
            'reduced',
            'exempted',
            'subscription',
            'subscriptionMemberLoyalty',
            'scholar',
            'group',
            'reseller',
            'other',
          ]),
          name: z.string().transform(transformStringOrNull),
          description: z.string().transform(transformStringOrNull),
          currency: z.literal('EUR'),
          facialValue: z.number().int().nonnegative(), // Cents
          valueIncvat: z.number().nonnegative(), // Not cents
          tax: z.object({
            rate: z.number().nonnegative(),
            countryCode: z.literal('FR').nullable(),
          }),
        })
      ),
    })
    .strip()
);
export type JsonEventDateSchemaType = z.infer<typeof JsonEventDateSchema>;

export const JsonCollectionSchema = applyTypedParsers(
  z.object({
    'hydra:totalItems': z.number().int().nonnegative(),
  })
);
export type JsonCollectionSchemaType = z.infer<typeof JsonCollectionSchema>;

export const JsonGetRecentTicketsResponseSchema = JsonCollectionSchema.extend({
  'hydra:member': z.array(JsonRecentTicketSchema),
});
export type JsonGetRecentTicketsResponseSchemaType = z.infer<typeof JsonGetRecentTicketsResponseSchema>;

export const JsonGetTicketsResponseSchema = JsonCollectionSchema.extend({
  'hydra:member': z.array(JsonTicketSchema),
});
export type JsonGetTicketsResponseSchemaType = z.infer<typeof JsonGetTicketsResponseSchema>;

export const JsonGetTicketingsResponseSchema = JsonCollectionSchema.extend({
  'hydra:member': z.array(JsonTicketingSchema),
});
export type JsonGetTicketingsResponseSchemaType = z.infer<typeof JsonGetTicketingsResponseSchema>;

export const JsonGetEventDatesResponseSchema = JsonCollectionSchema.extend({
  'hydra:member': z.array(JsonEventDateSchema),
});
export type JsonGetEventDatesResponseSchemaType = z.infer<typeof JsonGetEventDatesResponseSchema>;
