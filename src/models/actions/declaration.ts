import z from 'zod';

import { AttachmentInputSchema } from '@ad/src/models/entities/attachment';
import { DeclarationAttachmentTypeSchema } from '@ad/src/models/entities/common';
import {
  EventSchema,
  EventSerieSchema,
  StricterEventSerieSchema,
  assertAmountsRespectTaxLogic,
  assertValidExpenses,
} from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceInputSchema } from '@ad/src/models/entities/place';

export const TransmitDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
  })
  .strict();
export type TransmitDeclarationSchemaType = z.infer<typeof TransmitDeclarationSchema>;

export const GetDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
  })
  .strict();
export type GetDeclarationSchemaType = z.infer<typeof GetDeclarationSchema>;

export const GetDeclarationPrefillSchema = GetDeclarationSchema.partial();
export type GetDeclarationPrefillSchemaType = z.infer<typeof GetDeclarationPrefillSchema>;

export const fillDeclarationAttachmentsMax = 100;

// Avoid .pick() on refined schemas (zod 4.x limitation)
// Build new object schemas with only the fields we need

const FillOrganizationSchema = z.object({
  sacemId: OrganizationSchema.shape.sacemId,
  sacdId: OrganizationSchema.shape.sacdId,
});

const FillEventSerieSchema = z
  .object({
    performanceType: EventSerieSchema.shape.performanceType,
    expectedDeclarationTypes: EventSerieSchema.shape.expectedDeclarationTypes,
    placeCapacity: EventSerieSchema.shape.placeCapacity,
    audience: EventSerieSchema.shape.audience,
    ticketingRevenueTaxRate: EventSerieSchema.shape.ticketingRevenueTaxRate,
    expensesIncludingTaxes: EventSerieSchema.shape.expensesIncludingTaxes,
    expensesExcludingTaxes: EventSerieSchema.shape.expensesExcludingTaxes,
    expensesTaxRate: EventSerieSchema.shape.expensesTaxRate,
    introductionFeesExpensesIncludingTaxes: EventSerieSchema.shape.introductionFeesExpensesIncludingTaxes,
    introductionFeesExpensesExcludingTaxes: EventSerieSchema.shape.introductionFeesExpensesExcludingTaxes,
    introductionFeesExpensesTaxRate: EventSerieSchema.shape.introductionFeesExpensesTaxRate,
    circusSpecificExpensesIncludingTaxes: EventSerieSchema.shape.circusSpecificExpensesIncludingTaxes,
    circusSpecificExpensesExcludingTaxes: EventSerieSchema.shape.circusSpecificExpensesExcludingTaxes,
    circusSpecificExpensesTaxRate: EventSerieSchema.shape.circusSpecificExpensesTaxRate,
    place: PlaceInputSchema,
    producer: z
      .object({
        officialId: StricterEventSerieSchema.shape.producerOfficialId,
        name: StricterEventSerieSchema.shape.producerName,
      })
      .nullable(),
    attachments: z.array(
      z.object({
        id: AttachmentInputSchema,
        type: DeclarationAttachmentTypeSchema,
      })
    ),
  })
  .superRefine((data, ctx) => {
    assertValidExpenses(data, ctx);
    assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
    assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
    assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
  });

const FillEventSchema = z
  .object({
    id: EventSchema.shape.id,
    startAt: EventSchema.shape.startAt,
    endAt: EventSchema.shape.endAt,
    ticketingRevenueIncludingTaxes: EventSchema.shape.ticketingRevenueIncludingTaxes,
    ticketingRevenueExcludingTaxes: EventSchema.shape.ticketingRevenueExcludingTaxes,
    consumptionsRevenueIncludingTaxes: EventSchema.shape.consumptionsRevenueIncludingTaxes,
    consumptionsRevenueExcludingTaxes: EventSchema.shape.consumptionsRevenueExcludingTaxes,
    consumptionsRevenueTaxRate: EventSchema.shape.consumptionsRevenueTaxRate,
    cateringRevenueIncludingTaxes: EventSchema.shape.cateringRevenueIncludingTaxes,
    cateringRevenueExcludingTaxes: EventSchema.shape.cateringRevenueExcludingTaxes,
    cateringRevenueTaxRate: EventSchema.shape.cateringRevenueTaxRate,
    programSalesRevenueIncludingTaxes: EventSchema.shape.programSalesRevenueIncludingTaxes,
    programSalesRevenueExcludingTaxes: EventSchema.shape.programSalesRevenueExcludingTaxes,
    programSalesRevenueTaxRate: EventSchema.shape.programSalesRevenueTaxRate,
    otherRevenueIncludingTaxes: EventSchema.shape.otherRevenueIncludingTaxes,
    otherRevenueExcludingTaxes: EventSchema.shape.otherRevenueExcludingTaxes,
    otherRevenueTaxRate: EventSchema.shape.otherRevenueTaxRate,
    freeTickets: EventSchema.shape.freeTickets,
    paidTickets: EventSchema.shape.paidTickets,
    placeCapacityOverride: EventSchema.shape.placeCapacityOverride,
    audienceOverride: EventSchema.shape.audienceOverride,
    ticketingRevenueTaxRateOverride: EventSchema.shape.ticketingRevenueTaxRateOverride,
    placeOverride: PlaceInputSchema,
  })
  .superRefine((data, ctx) => {
    assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
    assertAmountsRespectTaxLogic(data, 'consumptionsRevenueExcludingTaxes', 'consumptionsRevenueIncludingTaxes', ctx);
    assertAmountsRespectTaxLogic(data, 'cateringRevenueExcludingTaxes', 'cateringRevenueIncludingTaxes', ctx);
    assertAmountsRespectTaxLogic(data, 'programSalesRevenueExcludingTaxes', 'programSalesRevenueIncludingTaxes', ctx);
    assertAmountsRespectTaxLogic(data, 'otherRevenueExcludingTaxes', 'otherRevenueIncludingTaxes', ctx);
  });

export const FillDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
    organization: FillOrganizationSchema,
    eventSerie: FillEventSerieSchema,
    events: z.array(FillEventSchema),
  })
  .strict();
export type FillDeclarationSchemaType = z.infer<typeof FillDeclarationSchema>;

export const FillDeclarationPrefillSchema = FillDeclarationSchema.partial();
export type FillDeclarationPrefillSchemaType = z.infer<typeof FillDeclarationPrefillSchema>;
