import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { AttachmentInputSchema, UiAttachmentSchema } from '@ad/src/models/entities/attachment';
import { DeclarationAttachmentTypeSchema, DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { StricterEventSchema, StricterEventSerieSchema, assertAmountsRespectTaxLogic, assertValidExpenses } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceInputSchema, PlaceSchema } from '@ad/src/models/entities/place';
import { TicketingSystemSchema } from '@ad/src/models/entities/ticketing';
import { applyTypedParsers } from '@ad/src/utils/zod';

// Avoid .pick() on refined schemas (zod 4.x limitation)
// Build new object schemas with only the fields we need

const declarationEventSerie = z.object({
  id: StricterEventSerieSchema.shape.id,
  name: StricterEventSerieSchema.shape.name,
  producerOfficialId: StricterEventSerieSchema.shape.producerOfficialId,
  producerName: StricterEventSerieSchema.shape.producerName,
  performanceType: StricterEventSerieSchema.shape.performanceType,
  expectedDeclarationTypes: StricterEventSerieSchema.shape.expectedDeclarationTypes,
  placeCapacity: StricterEventSerieSchema.shape.placeCapacity,
  audience: StricterEventSerieSchema.shape.audience,
  ticketingRevenueTaxRate: StricterEventSerieSchema.shape.ticketingRevenueTaxRate,
  expensesIncludingTaxes: StricterEventSerieSchema.shape.expensesIncludingTaxes,
  expensesExcludingTaxes: StricterEventSerieSchema.shape.expensesExcludingTaxes,
  expensesTaxRate: StricterEventSerieSchema.shape.expensesTaxRate,
  introductionFeesExpensesIncludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesIncludingTaxes,
  introductionFeesExpensesExcludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesExcludingTaxes,
  introductionFeesExpensesTaxRate: StricterEventSerieSchema.shape.introductionFeesExpensesTaxRate,
  circusSpecificExpensesIncludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesIncludingTaxes,
  circusSpecificExpensesExcludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesExcludingTaxes,
  circusSpecificExpensesTaxRate: StricterEventSerieSchema.shape.circusSpecificExpensesTaxRate,
  attachments: StricterEventSerieSchema.shape.attachments,
  place: PlaceSchema.nullable(),
});

export const DeclarationSchema = applyTypedParsers(
  z
    .object({
      organization: z.object({
        id: OrganizationSchema.shape.id,
        name: OrganizationSchema.shape.name,
        officialId: OrganizationSchema.shape.officialId,
        officialHeadquartersId: OrganizationSchema.shape.officialHeadquartersId,
        sacemId: OrganizationSchema.shape.sacemId,
        sacdId: OrganizationSchema.shape.sacdId,
        headquartersAddress: AddressSchema,
      }),
      eventSerie: declarationEventSerie.superRefine((data, ctx) => {
        // Had to be reapplied since we picked up a few properties
        assertValidExpenses(data, ctx);
        assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
        assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
        assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
      }),
      events: z.array(
        z.object({
          id: StricterEventSchema.shape.id,
          startAt: StricterEventSchema.shape.startAt,
          endAt: StricterEventSchema.shape.endAt,
          ticketingRevenueIncludingTaxes: StricterEventSchema.shape.ticketingRevenueIncludingTaxes,
          ticketingRevenueExcludingTaxes: StricterEventSchema.shape.ticketingRevenueExcludingTaxes,
          consumptionsRevenueIncludingTaxes: StricterEventSchema.shape.consumptionsRevenueIncludingTaxes,
          consumptionsRevenueExcludingTaxes: StricterEventSchema.shape.consumptionsRevenueExcludingTaxes,
          consumptionsRevenueTaxRate: StricterEventSchema.shape.consumptionsRevenueTaxRate,
          cateringRevenueIncludingTaxes: StricterEventSchema.shape.cateringRevenueIncludingTaxes,
          cateringRevenueExcludingTaxes: StricterEventSchema.shape.cateringRevenueExcludingTaxes,
          cateringRevenueTaxRate: StricterEventSchema.shape.cateringRevenueTaxRate,
          programSalesRevenueIncludingTaxes: StricterEventSchema.shape.programSalesRevenueIncludingTaxes,
          programSalesRevenueExcludingTaxes: StricterEventSchema.shape.programSalesRevenueExcludingTaxes,
          programSalesRevenueTaxRate: StricterEventSchema.shape.programSalesRevenueTaxRate,
          otherRevenueIncludingTaxes: StricterEventSchema.shape.otherRevenueIncludingTaxes,
          otherRevenueExcludingTaxes: StricterEventSchema.shape.otherRevenueExcludingTaxes,
          otherRevenueTaxRate: StricterEventSchema.shape.otherRevenueTaxRate,
          freeTickets: StricterEventSchema.shape.freeTickets,
          paidTickets: StricterEventSchema.shape.paidTickets,
          placeCapacityOverride: StricterEventSchema.shape.placeCapacityOverride,
          audienceOverride: StricterEventSchema.shape.audienceOverride,
          ticketingRevenueTaxRateOverride: StricterEventSchema.shape.ticketingRevenueTaxRateOverride,
          placeOverride: PlaceSchema.nullable(),
        })
          .superRefine((data, ctx) => {
            // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
            assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'consumptionsRevenueExcludingTaxes', 'consumptionsRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'cateringRevenueExcludingTaxes', 'cateringRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'programSalesRevenueExcludingTaxes', 'programSalesRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'otherRevenueExcludingTaxes', 'otherRevenueIncludingTaxes', ctx);
          })
      ),
    })
    .strict()
);
export type DeclarationSchemaType = z.infer<typeof DeclarationSchema>;

export const DeclarationInputSchema = applyTypedParsers(
  z
    .object({
      organization: DeclarationSchema.shape.organization,
      eventSerie: z.object({
        id: StricterEventSerieSchema.shape.id,
        name: StricterEventSerieSchema.shape.name,
        producerOfficialId: StricterEventSerieSchema.shape.producerOfficialId,
        producerName: StricterEventSerieSchema.shape.producerName,
        performanceType: StricterEventSerieSchema.shape.performanceType,
        expectedDeclarationTypes: StricterEventSerieSchema.shape.expectedDeclarationTypes,
        placeCapacity: StricterEventSerieSchema.shape.placeCapacity,
        audience: StricterEventSerieSchema.shape.audience,
        ticketingRevenueTaxRate: StricterEventSerieSchema.shape.ticketingRevenueTaxRate,
        expensesIncludingTaxes: StricterEventSerieSchema.shape.expensesIncludingTaxes,
        expensesExcludingTaxes: StricterEventSerieSchema.shape.expensesExcludingTaxes,
        expensesTaxRate: StricterEventSerieSchema.shape.expensesTaxRate,
        introductionFeesExpensesIncludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesIncludingTaxes,
        introductionFeesExpensesExcludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesExcludingTaxes,
        introductionFeesExpensesTaxRate: StricterEventSerieSchema.shape.introductionFeesExpensesTaxRate,
        circusSpecificExpensesIncludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesIncludingTaxes,
        circusSpecificExpensesExcludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesExcludingTaxes,
        circusSpecificExpensesTaxRate: StricterEventSerieSchema.shape.circusSpecificExpensesTaxRate,
        place: PlaceInputSchema,
        attachments: z.array(
          z.object({
            id: AttachmentInputSchema,
            type: DeclarationAttachmentTypeSchema,
          })
        ),
      })
        .superRefine((data, ctx) => {
          // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
          assertValidExpenses(data, ctx);
          assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
        }),
      events: z.array(
        z.object({
          id: StricterEventSchema.shape.id,
          startAt: StricterEventSchema.shape.startAt,
          endAt: StricterEventSchema.shape.endAt,
          ticketingRevenueIncludingTaxes: StricterEventSchema.shape.ticketingRevenueIncludingTaxes,
          ticketingRevenueExcludingTaxes: StricterEventSchema.shape.ticketingRevenueExcludingTaxes,
          consumptionsRevenueIncludingTaxes: StricterEventSchema.shape.consumptionsRevenueIncludingTaxes,
          consumptionsRevenueExcludingTaxes: StricterEventSchema.shape.consumptionsRevenueExcludingTaxes,
          consumptionsRevenueTaxRate: StricterEventSchema.shape.consumptionsRevenueTaxRate,
          cateringRevenueIncludingTaxes: StricterEventSchema.shape.cateringRevenueIncludingTaxes,
          cateringRevenueExcludingTaxes: StricterEventSchema.shape.cateringRevenueExcludingTaxes,
          cateringRevenueTaxRate: StricterEventSchema.shape.cateringRevenueTaxRate,
          programSalesRevenueIncludingTaxes: StricterEventSchema.shape.programSalesRevenueIncludingTaxes,
          programSalesRevenueExcludingTaxes: StricterEventSchema.shape.programSalesRevenueExcludingTaxes,
          programSalesRevenueTaxRate: StricterEventSchema.shape.programSalesRevenueTaxRate,
          otherRevenueIncludingTaxes: StricterEventSchema.shape.otherRevenueIncludingTaxes,
          otherRevenueExcludingTaxes: StricterEventSchema.shape.otherRevenueExcludingTaxes,
          otherRevenueTaxRate: StricterEventSchema.shape.otherRevenueTaxRate,
          freeTickets: StricterEventSchema.shape.freeTickets,
          paidTickets: StricterEventSchema.shape.paidTickets,
          placeCapacityOverride: StricterEventSchema.shape.placeCapacityOverride,
          audienceOverride: StricterEventSchema.shape.audienceOverride,
          ticketingRevenueTaxRateOverride: StricterEventSchema.shape.ticketingRevenueTaxRateOverride,
          placeOverride: PlaceInputSchema,
        })
          .superRefine((data, ctx) => {
            // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
            assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'consumptionsRevenueExcludingTaxes', 'consumptionsRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'cateringRevenueExcludingTaxes', 'cateringRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'programSalesRevenueExcludingTaxes', 'programSalesRevenueIncludingTaxes', ctx);
            assertAmountsRespectTaxLogic(data, 'otherRevenueExcludingTaxes', 'otherRevenueIncludingTaxes', ctx);
          })
      ),
    })
    .strict()
);
export type DeclarationInputSchemaType = z.infer<typeof DeclarationInputSchema>;

export const DeclarationWrapperSchema = applyTypedParsers(
  z
    .object({
      declaration: DeclarationSchema.extend({
        organization: DeclarationSchema.shape.organization,
        eventSerie: declarationEventSerie.extend({
          attachments: z.array(
            UiAttachmentSchema.extend({
              type: DeclarationAttachmentTypeSchema,
            })
          ),
        }),
        events: DeclarationSchema.shape.events,
      }),
      ticketingSystemName: TicketingSystemSchema.shape.name,
      // We provide some suggestions from past declarations to fill the current one
      placeholder: z.object({
        producer: z.array(
          z.object({
            officialId: StricterEventSerieSchema.shape.producerOfficialId,
            name: StricterEventSerieSchema.shape.producerName,
          })
        ),
        place: z.array(PlaceSchema),
        placeCapacity: z.array(StricterEventSerieSchema.shape.placeCapacity),
      }),
      transmissions: z.array(
        z.object({
          type: DeclarationTypeSchema,
          status: DeclarationStatusSchema,
          hasError: z.boolean(),
        })
      ),
    })
    .strict()
);
export type DeclarationWrapperSchemaType = z.infer<typeof DeclarationWrapperSchema>;
