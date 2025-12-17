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
import { OrganizationSchema, StricterOrganizationSchema } from '@ad/src/models/entities/organization';
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
export const FillDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
    organization: OrganizationSchema.pick({
      sacemId: true,
      sacdId: true,
    }).extend({
      sibil: z
        .object({
          username: StricterOrganizationSchema.shape.sibilUsername,
          password: StricterOrganizationSchema.shape.sibilPassword,
        })
        .nullable(),
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
      })
        .extend({
          placeOverride: PlaceInputSchema,
        })
        .superRefine((data, ctx) => {
          assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'consumptionsRevenueExcludingTaxes', 'consumptionsRevenueIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'cateringRevenueExcludingTaxes', 'cateringRevenueIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'programSalesRevenueExcludingTaxes', 'programSalesRevenueIncludingTaxes', ctx);
          assertAmountsRespectTaxLogic(data, 'otherRevenueExcludingTaxes', 'otherRevenueIncludingTaxes', ctx);
        })
    ),
  })
  .strict();
export type FillDeclarationSchemaType = z.infer<typeof FillDeclarationSchema>;

export const FillDeclarationPrefillSchema = FillDeclarationSchema.partial();
export type FillDeclarationPrefillSchemaType = z.infer<typeof FillDeclarationPrefillSchema>;
