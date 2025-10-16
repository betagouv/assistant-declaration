import z from 'zod';

import { EventSchema, EventSerieSchema, StricterEventSerieSchema, assertValidExpenses } from '@ad/src/models/entities/event';
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

export const FillDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
    organization: OrganizationSchema.pick({
      sacemId: true,
      sacdId: true,
    }),
    eventSerie: EventSerieSchema.pick({
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
        producer: z
          .object({
            officialId: StricterEventSerieSchema.shape.producerOfficialId,
            name: StricterEventSerieSchema.shape.producerName,
          })
          .nullable(),
      })
      .superRefine((data, ctx) => {
        assertValidExpenses(data, ctx); // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
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
        ticketingRevenueTaxRateOverride: true, // TODO: waiting to know if using them or not
      }).extend({
        placeOverride: PlaceInputSchema,
      })
    ),
  })
  .strict();
export type FillDeclarationSchemaType = z.infer<typeof FillDeclarationSchema>;

export const FillDeclarationPrefillSchema = FillDeclarationSchema.partial();
export type FillDeclarationPrefillSchemaType = z.infer<typeof FillDeclarationPrefillSchema>;
