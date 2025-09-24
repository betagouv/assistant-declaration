import z from 'zod';

import { DeclarationStatusSchema, DeclarationTypeSchema, OfficialIdSchema } from '@ad/src/models/entities/common';
import { DeclarationSchema } from '@ad/src/models/entities/declaration';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const AudienceSchema = z.enum(['ALL', 'YOUNG', 'SCHOOL']);
export type AudienceSchemaType = z.infer<typeof AudienceSchema>;

export const PerformanceTypeSchema = z.enum([
  'OUTDOOR_PERFORMANCE',
  'CABARET_AND_MUSIC_HALL',
  'CIRCUS_AND_MAGIC',
  'MUSICAL_THEATRE',
  'DANCE',
  'COMEDY_AND_STAND_UP',
  'PUPPETRY',
  'CLASSICAL_AND_OPERA_AND_CONTEMPORARY_MUSIC',
  'POPULAR_AND_JAZZ_MUSIC',
  'WORLD_AND_TRADITIONAL_MUSIC_AND_DANCE',
  'HISTORICAL_REENACTMENTS_AND_HERITAGE_SOUND_AND_LIGHT_SHOWS',
  'LIVE_PERFORMANCE_WITHOUT_DOMINANT_DISCIPLINE',
  'ICE_SHOWS_AND_THEME_PARKS_AND_RELATED_PERFORMANCES',
  'THEATRE_AND_STORYTELLING_AND_MIME',
]);
export type PerformanceTypeSchemaType = z.infer<typeof PerformanceTypeSchema>;

export const LiteEventSerieSchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: z.string().min(1),
      name: z.string().min(1),
      startAt: z.date(),
      endAt: z.date(),
      taxRate: z.number().nonnegative(),
    })
    .strict()
);
export type LiteEventSerieSchemaType = z.infer<typeof LiteEventSerieSchema>;

export const LiteEventSchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: z.string().min(1),
      startAt: z.date(),
      endAt: z.date(),
    })
    .strict()
);
export type LiteEventSchemaType = z.infer<typeof LiteEventSchema>;

export const LiteEventSerieWrapperSchema = applyTypedParsers(
  z
    .object({
      serie: LiteEventSerieSchema,
      events: z.array(LiteEventSchema),
    })
    .strict()
);
export type LiteEventSerieWrapperSchemaType = z.infer<typeof LiteEventSerieWrapperSchema>;

export const EventSerieSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      internalTicketingSystemId: z.string().min(1),
      ticketingSystemId: z.string().uuid(),
      name: z.string().min(1),
      producerOfficialId: OfficialIdSchema.nullable(),
      producerName: z.string().min(1).nullable(),
      performanceType: PerformanceTypeSchema.nullable(),
      expectedDeclarationTypes: z.array(DeclarationTypeSchema),
      placeId: z.string().uuid().nullable(),
      placeCapacity: z.number().int().nonnegative().nullable(),
      audience: AudienceSchema,
      taxRate: z.number().nonnegative(),
      expensesAmount: z.number().nonnegative(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type EventSerieSchemaType = z.infer<typeof EventSerieSchema>;

export const EventSerieWrapperSchema = applyTypedParsers(
  z
    .object({
      serie: EventSerieSchema,
      partialDeclarations: z.array(
        // This is partial declarations just to adjust the UI
        z.object({
          type: DeclarationTypeSchema,
          status: DeclarationStatusSchema,
          transmittedAt: DeclarationSchema.shape.transmittedAt,
        })
      ),
    })
    .strict()
);
export type EventSerieWrapperSchemaType = z.infer<typeof EventSerieWrapperSchema>;

export const EventSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      internalTicketingSystemId: z.string().min(1),
      eventSerieId: z.string().uuid(),
      startAt: z.date(),
      endAt: z.date().nullable(),
      ticketingRevenueIncludingTaxes: z.number().nonnegative(),
      ticketingRevenueExcludingTaxes: z.number().nonnegative(),
      ticketingRevenueTaxRate: z.number().nonnegative(),
      freeTickets: z.number().int().nonnegative(),
      paidTickets: z.number().int().nonnegative(),
      placeOverrideId: z.string().uuid().nullable(),
      placeCapacityOverride: z.number().int().nonnegative().nullable(),
      audienceOverride: AudienceSchema.nullable(),
      taxRateOverride: z.number().nonnegative().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type EventSchemaType = z.infer<typeof EventSchema>;

export const EventWrapperSchema = applyTypedParsers(
  z
    .object({
      event: EventSchema,
    })
    .strict()
);
export type EventWrapperSchemaType = z.infer<typeof EventWrapperSchema>;
