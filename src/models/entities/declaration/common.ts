import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import {
  EventSchema,
  EventSerieSchema,
  StricterEventSerieSchema,
  assertAmountsRespectTaxLogic,
  assertValidExpenses,
} from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceInputSchema, PlaceSchema } from '@ad/src/models/entities/place';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const DeclarationSchema = applyTypedParsers(
  z
    .object({
      organization: OrganizationSchema.pick({
        id: true,
        name: true,
        officialId: true,
        officialHeadquartersId: true,
        sacemId: true,
        sacdId: true,
      }).extend({
        headquartersAddress: AddressSchema,
      }),
      eventSerie: EventSerieSchema.pick({
        id: true,
        name: true,
        producerOfficialId: true,
        producerName: true,
        performanceType: true,
        expectedDeclarationTypes: true,
        placeCapacity: true,
        audience: true,
        ticketingRevenueTaxRate: true,
        expensesIncludingTaxes: true,
        expensesExcludingTaxes: true,
        expensesTaxRate: true,
        introductionFeesExpensesIncludingTaxes: true,
        introductionFeesExpensesExcludingTaxes: true,
        introductionFeesExpensesTaxRate: true,
        circusSpecificExpensesIncludingTaxes: true,
        circusSpecificExpensesExcludingTaxes: true,
        circusSpecificExpensesTaxRate: true,
      })
        .extend({
          place: PlaceSchema.nullable(),
        })
        .superRefine((data, ctx) => {
          // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
          assertValidExpenses(data, ctx);
          assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
        }),
      events: z.array(
        EventSchema.pick({
          id: true,
          startAt: true,
          endAt: true,
          ticketingRevenueIncludingTaxes: true,
          ticketingRevenueExcludingTaxes: true,
          consumptionsRevenueIncludingTaxes: true,
          consumptionsRevenueExcludingTaxes: true,
          consumptionsRevenueTaxRate: true,
          cateringRevenueIncludingTaxes: true,
          cateringRevenueExcludingTaxes: true,
          cateringRevenueTaxRate: true,
          programSalesRevenueIncludingTaxes: true,
          programSalesRevenueExcludingTaxes: true,
          programSalesRevenueTaxRate: true,
          otherRevenueIncludingTaxes: true,
          otherRevenueExcludingTaxes: true,
          otherRevenueTaxRate: true,
          freeTickets: true,
          paidTickets: true,
          placeCapacityOverride: true,
          audienceOverride: true,
          ticketingRevenueTaxRateOverride: true,
        })
          .extend({
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
      eventSerie: EventSerieSchema.pick({
        id: true,
        name: true,
        producerOfficialId: true,
        producerName: true,
        performanceType: true,
        expectedDeclarationTypes: true,
        placeCapacity: true,
        audience: true,
        ticketingRevenueTaxRate: true,
        expensesIncludingTaxes: true,
        expensesExcludingTaxes: true,
        expensesTaxRate: true,
        introductionFeesExpensesIncludingTaxes: true,
        introductionFeesExpensesExcludingTaxes: true,
        introductionFeesExpensesTaxRate: true,
        circusSpecificExpensesIncludingTaxes: true,
        circusSpecificExpensesExcludingTaxes: true,
        circusSpecificExpensesTaxRate: true,
      })
        .extend({
          place: PlaceInputSchema,
        })
        .superRefine((data, ctx) => {
          // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
          assertValidExpenses(data, ctx);
          assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
        }),
      events: z.array(
        EventSchema.pick({
          id: true,
          startAt: true,
          endAt: true,
          ticketingRevenueIncludingTaxes: true,
          ticketingRevenueExcludingTaxes: true,
          consumptionsRevenueIncludingTaxes: true,
          consumptionsRevenueExcludingTaxes: true,
          consumptionsRevenueTaxRate: true,
          cateringRevenueIncludingTaxes: true,
          cateringRevenueExcludingTaxes: true,
          cateringRevenueTaxRate: true,
          programSalesRevenueIncludingTaxes: true,
          programSalesRevenueExcludingTaxes: true,
          programSalesRevenueTaxRate: true,
          otherRevenueIncludingTaxes: true,
          otherRevenueExcludingTaxes: true,
          otherRevenueTaxRate: true,
          freeTickets: true,
          paidTickets: true,
          placeCapacityOverride: true,
          audienceOverride: true,
          ticketingRevenueTaxRateOverride: true,
        })
          .extend({
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
      declaration: DeclarationSchema,
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
