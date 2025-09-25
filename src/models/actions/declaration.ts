import z from 'zod';

import { EventSchema, EventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';

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

export const GetDeclarationPrefillSchema = GetDeclarationSchema.deepPartial();
export type GetDeclarationPrefillSchemaType = z.infer<typeof GetDeclarationPrefillSchema>;

export const FillDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
    organization: OrganizationSchema.pick({
      sacemId: true,
      sacdId: true,
    }),
    eventSerie: EventSerieSchema.pick({
      producerOfficialId: true,
      producerName: true,
      performanceType: true,
      expectedDeclarationTypes: true,
      placeId: true,
      placeCapacity: true,
      audience: true,
      taxRate: true,
      expensesAmount: true,
    }),
    events: z.array(
      EventSchema.pick({
        id: true,
        startAt: true,
        endAt: true,
        ticketingRevenueIncludingTaxes: true,
        ticketingRevenueExcludingTaxes: true,
        ticketingRevenueTaxRate: true,
        freeTickets: true,
        paidTickets: true,
        placeOverrideId: true,
        placeCapacityOverride: true,
        audienceOverride: true,
        taxRateOverride: true,
      })
    ),
  })
  .strict();
export type FillDeclarationSchemaType = z.infer<typeof FillDeclarationSchema>;

export const FillDeclarationPrefillSchema = FillDeclarationSchema.deepPartial();
export type FillDeclarationPrefillSchemaType = z.infer<typeof FillDeclarationPrefillSchema>;
