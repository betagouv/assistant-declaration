import z from 'zod';

import { DeclarationStatusSchema, DeclarationTypeSchema, OfficialIdSchema } from '@ad/src/models/entities/common';
import {
  eventSeriePartialExpensesGreatherThanTotalError,
  includingTaxesAmountCannotBeLowerThanExcludingTaxesAmountError,
  nonZeroExcludingTaxesAmountRequiresNonZeroIncludingTaxesAmountError,
  nonZeroIncludingTaxesAmountRequiresNonZeroExcludingTaxesAmountError,
} from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
import { PlaceSchema } from '@ad/src/models/entities/place';
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

export const StricterEventSerieSchema = z.object({
  id: z.uuid(),
  internalTicketingSystemId: z.string().min(1),
  ticketingSystemId: z.uuid(),
  name: z.string().min(1),
  producerOfficialId: OfficialIdSchema,
  producerName: z.string().min(1),
  performanceType: PerformanceTypeSchema,
  expectedDeclarationTypes: z.array(DeclarationTypeSchema),
  placeId: z.uuid(),
  placeCapacity: z.number().int().nonnegative(),
  audience: AudienceSchema,
  ticketingRevenueTaxRate: z.number().nonnegative(),
  expensesIncludingTaxes: z.number().nonnegative(),
  expensesExcludingTaxes: z.number().nonnegative(),
  expensesTaxRate: z.number().nonnegative(),
  introductionFeesExpensesIncludingTaxes: z.number().nonnegative(),
  introductionFeesExpensesExcludingTaxes: z.number().nonnegative(),
  introductionFeesExpensesTaxRate: z.number().nonnegative(),
  circusSpecificExpensesIncludingTaxes: z.number().nonnegative(),
  circusSpecificExpensesExcludingTaxes: z.number().nonnegative(),
  circusSpecificExpensesTaxRate: z.number().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export function assertValidExpenses(
  data: {
    expensesIncludingTaxes: number;
    expensesExcludingTaxes: number;
    introductionFeesExpensesIncludingTaxes: number;
    introductionFeesExpensesExcludingTaxes: number;
    circusSpecificExpensesIncludingTaxes?: number | null;
    circusSpecificExpensesExcludingTaxes?: number | null;
  },
  ctx: z.RefinementCtx
) {
  // Excluding taxes
  let partialExpensesExcludingTaxes = data.introductionFeesExpensesExcludingTaxes;

  if (data.circusSpecificExpensesExcludingTaxes !== undefined && data.circusSpecificExpensesExcludingTaxes !== null) {
    partialExpensesExcludingTaxes += data.circusSpecificExpensesExcludingTaxes;
  }

  if (data.expensesExcludingTaxes < partialExpensesExcludingTaxes) {
    ctx.issues.push({
      ...customErrorToZodIssue(eventSeriePartialExpensesGreatherThanTotalError, {
        overridePath: ['expensesExcludingTaxes' satisfies keyof typeof data], // Concatenated to where the `superRefine` is applied
      }),
      input: {
        expensesExcludingTaxes: data.expensesExcludingTaxes,
        introductionFeesExpensesExcludingTaxes: data.introductionFeesExpensesExcludingTaxes,
        circusSpecificExpensesExcludingTaxes: data.circusSpecificExpensesExcludingTaxes,
      },
    });
  }

  // Including taxes
  let partialExpensesIncludingTaxes = data.introductionFeesExpensesIncludingTaxes;

  if (data.circusSpecificExpensesIncludingTaxes !== undefined && data.circusSpecificExpensesIncludingTaxes !== null) {
    partialExpensesIncludingTaxes += data.circusSpecificExpensesIncludingTaxes;
  }

  if (data.expensesIncludingTaxes < partialExpensesIncludingTaxes) {
    ctx.issues.push({
      ...customErrorToZodIssue(eventSeriePartialExpensesGreatherThanTotalError, {
        overridePath: ['expensesIncludingTaxes' satisfies keyof typeof data], // Concatenated to where the `superRefine` is applied
      }),
      input: {
        expensesIncludingTaxes: data.expensesIncludingTaxes,
        introductionFeesExpensesIncludingTaxes: data.introductionFeesExpensesIncludingTaxes,
        circusSpecificExpensesIncludingTaxes: data.circusSpecificExpensesIncludingTaxes,
      },
    });
  }
}

export function assertAmountsRespectTaxLogic<T extends object, KExcl extends keyof T, KIncl extends keyof T>(
  data: T & { [P in KExcl | KIncl]: number | null },
  excludingTaxesAmountKey: KExcl,
  includingTaxesAmountKey: KIncl,
  ctx: z.RefinementCtx
) {
  // Cannot provide just one of the two amounts, without respecting a few rules of tax logic
  const excludingTaxesAmount: number | null = data[excludingTaxesAmountKey];
  const includingTaxesAmount: number | null = data[includingTaxesAmountKey];

  const inputForErrors = {
    [excludingTaxesAmountKey]: excludingTaxesAmount,
    [includingTaxesAmountKey]: includingTaxesAmount,
  };

  if (excludingTaxesAmount === null && includingTaxesAmount === null) {
    return;
  } else if (includingTaxesAmount === null) {
    ctx.issues.push({
      path: [includingTaxesAmountKey], // Concatenated to where the `superRefine` is applied
      code: 'invalid_type',
      expected: 'number',
      input: inputForErrors,
    });
  } else if (excludingTaxesAmount === null) {
    ctx.issues.push({
      path: [excludingTaxesAmountKey], // Concatenated to where the `superRefine` is applied
      code: 'invalid_type',
      expected: 'number',
      input: inputForErrors,
    });
  } else if (excludingTaxesAmount > 0 && includingTaxesAmount === 0) {
    ctx.issues.push({
      ...customErrorToZodIssue(nonZeroExcludingTaxesAmountRequiresNonZeroIncludingTaxesAmountError, {
        overridePath: [includingTaxesAmountKey as string],
      }),
      input: inputForErrors,
    });
  } else if (excludingTaxesAmount === 0 && includingTaxesAmount > 0) {
    ctx.issues.push({
      ...customErrorToZodIssue(nonZeroIncludingTaxesAmountRequiresNonZeroExcludingTaxesAmountError, {
        overridePath: [excludingTaxesAmountKey as string],
      }),
      input: inputForErrors,
    });
  } else if (includingTaxesAmount < excludingTaxesAmount) {
    // It must be greater or equal
    ctx.issues.push({
      ...customErrorToZodIssue(includingTaxesAmountCannotBeLowerThanExcludingTaxesAmountError, {
        overridePath: [includingTaxesAmountKey as string],
      }),
      input: inputForErrors,
    });
  }
}

export const EventSerieSchema = applyTypedParsers(
  StricterEventSerieSchema.extend({
    producerOfficialId: StricterEventSerieSchema.shape.producerOfficialId.nullable(),
    producerName: StricterEventSerieSchema.shape.producerName.nullable(),
    performanceType: StricterEventSerieSchema.shape.performanceType.nullable(),
    placeId: StricterEventSerieSchema.shape.placeId.nullable(),
    placeCapacity: StricterEventSerieSchema.shape.placeCapacity.nullable(),
    expensesTaxRate: StricterEventSerieSchema.shape.expensesTaxRate.nullable(),
    introductionFeesExpensesTaxRate: StricterEventSerieSchema.shape.introductionFeesExpensesTaxRate.nullable(),
    circusSpecificExpensesIncludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesIncludingTaxes.nullable(),
    circusSpecificExpensesExcludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesExcludingTaxes.nullable(),
    circusSpecificExpensesTaxRate: StricterEventSerieSchema.shape.circusSpecificExpensesTaxRate.nullable(),
  })
    .superRefine((data, ctx) => {
      assertValidExpenses(data, ctx);
      assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
    })
    .strict()
);
export type EventSerieSchemaType = z.infer<typeof EventSerieSchema>;

export const EventSerieWrapperSchema = applyTypedParsers(
  z
    .object({
      serie: EventSerieSchema,
      computedStartAt: z.date(),
      computedEndAt: z.date(),
      place: PlaceSchema.nullable(),
      partialDeclarations: z.array(
        // This is partial declarations just to adjust the UI
        z.object({
          type: DeclarationTypeSchema,
          status: DeclarationStatusSchema,
          // transmittedAt: DeclarationSchema.shape.transmittedAt,
          transmittedAt: z.unknown(),
        })
      ),
    })
    .strict()
);
export type EventSerieWrapperSchemaType = z.infer<typeof EventSerieWrapperSchema>;

export const StricterEventSchema = z.object({
  id: z.uuid(),
  internalTicketingSystemId: z.string().min(1),
  eventSerieId: z.uuid(),
  startAt: z.date(),
  endAt: z.date(),
  ticketingRevenueIncludingTaxes: z.number().nonnegative(),
  ticketingRevenueExcludingTaxes: z.number().nonnegative(),
  consumptionsRevenueIncludingTaxes: z.number().nonnegative(),
  consumptionsRevenueExcludingTaxes: z.number().nonnegative(),
  consumptionsRevenueTaxRate: z.number().nonnegative(),
  cateringRevenueIncludingTaxes: z.number().nonnegative(),
  cateringRevenueExcludingTaxes: z.number().nonnegative(),
  cateringRevenueTaxRate: z.number().nonnegative(),
  programSalesRevenueIncludingTaxes: z.number().nonnegative(),
  programSalesRevenueExcludingTaxes: z.number().nonnegative(),
  programSalesRevenueTaxRate: z.number().nonnegative(),
  otherRevenueIncludingTaxes: z.number().nonnegative(),
  otherRevenueExcludingTaxes: z.number().nonnegative(),
  otherRevenueTaxRate: z.number().nonnegative(),
  freeTickets: z.number().int().nonnegative(),
  paidTickets: z.number().int().nonnegative(),
  placeOverrideId: EventSerieSchema.shape.placeId,
  placeCapacityOverride: EventSerieSchema.shape.placeCapacity,
  audienceOverride: EventSerieSchema.shape.audience,
  ticketingRevenueTaxRateOverride: EventSerieSchema.shape.ticketingRevenueTaxRate,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EventSchema = applyTypedParsers(
  StricterEventSchema.extend({
    endAt: StricterEventSchema.shape.endAt.nullable(),
    consumptionsRevenueTaxRate: StricterEventSchema.shape.consumptionsRevenueTaxRate.nullable(),
    cateringRevenueTaxRate: StricterEventSchema.shape.cateringRevenueTaxRate.nullable(),
    programSalesRevenueTaxRate: StricterEventSchema.shape.programSalesRevenueTaxRate.nullable(),
    otherRevenueTaxRate: StricterEventSchema.shape.otherRevenueTaxRate.nullable(),
    placeOverrideId: StricterEventSchema.shape.placeOverrideId.nullable(),
    placeCapacityOverride: StricterEventSchema.shape.placeCapacityOverride.nullable(),
    audienceOverride: StricterEventSchema.shape.audienceOverride.nullable(),
    ticketingRevenueTaxRateOverride: StricterEventSchema.shape.ticketingRevenueTaxRateOverride.nullable(),
  })
    .superRefine((data, ctx) => {
      assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'consumptionsRevenueExcludingTaxes', 'consumptionsRevenueIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'cateringRevenueExcludingTaxes', 'cateringRevenueIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'programSalesRevenueExcludingTaxes', 'programSalesRevenueIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'otherRevenueExcludingTaxes', 'otherRevenueIncludingTaxes', ctx);
    })
    .strict()
);
export type EventSchemaType = z.infer<typeof EventSchema>;

export const EventWrapperSchema = applyTypedParsers(
  z
    .object({
      event: EventSchema,
      placeOverride: PlaceSchema.nullable(),
    })
    .strict()
);
export type EventWrapperSchemaType = z.infer<typeof EventWrapperSchema>;

export const LiteEventSerieSchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: EventSerieSchema.shape.internalTicketingSystemId,
      name: EventSerieSchema.shape.name,
      // The default values (location/venue...) should not be aggregated/computed within ticketing system connector
      // Instead the logic of parsing their results is responsible of it to have something equivalent (within `synchronize.ts`)
    })
    .strict()
);
export type LiteEventSerieSchemaType = z.infer<typeof LiteEventSerieSchema>;

export const LiteEventSchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: EventSchema.shape.internalTicketingSystemId,
      startAt: z.date(),
      endAt: z.date().nullable(),
      ticketingRevenueIncludingTaxes: EventSchema.shape.ticketingRevenueIncludingTaxes,
      ticketingRevenueExcludingTaxes: EventSchema.shape.ticketingRevenueExcludingTaxes,
      ticketingRevenueTaxRate: EventSchema.shape.ticketingRevenueTaxRateOverride.nullable(),
      freeTickets: EventSchema.shape.freeTickets,
      paidTickets: EventSchema.shape.paidTickets,
      // TODO: in the future try to retrieve the location/venue (but we should ensure valid address to not with those variating from 1 character...)
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
