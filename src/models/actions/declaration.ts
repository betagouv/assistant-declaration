import z from 'zod';

import { AddressInputSchema } from '@ad/src/models/entities/address';
import { EventSchema, EventSerieSchema, StricterEventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceSchema } from '@ad/src/models/entities/place';

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
      performanceType: true,
      expectedDeclarationTypes: true,
      placeId: true, // TODO: should be PlaceInput, z.or(id, or object with text?) ... or just text and compare on backend?
      placeCapacity: true,
      audience: true,
      taxRate: true,
      expensesExcludingTaxes: true,
    }).extend({
      placeTmp: z.object({
        name: PlaceSchema.shape.name.nullable(),
        address: AddressInputSchema.nullable(),
      }),
      producer: z
        .object({
          officialId: StricterEventSerieSchema.shape.producerOfficialId,
          name: StricterEventSerieSchema.shape.producerName,
        })
        .nullable(),
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
