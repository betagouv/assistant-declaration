import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { EventSchema, EventSerieSchema, StricterEventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceSchema } from '@ad/src/models/entities/place';
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
      }).merge(
        z.object({
          headquartersAddress: AddressSchema,
        })
      ),
      eventSerie: EventSerieSchema.pick({
        id: true,
        name: true,
        producerOfficialId: true,
        producerName: true,
        performanceType: true,
        expectedDeclarationTypes: true,
        placeCapacity: true,
        audience: true,
        taxRate: true,
        expensesExcludingTaxes: true,
      }).merge(
        z.object({
          place: PlaceSchema.nullable(),
        })
      ),
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
          placeCapacityOverride: true,
          audienceOverride: true,
          taxRateOverride: true,
        }).merge(
          z.object({
            placeOverride: PlaceSchema.nullable(),
          })
        )
      ),
    })
    .strict()
);
export type DeclarationSchemaType = z.infer<typeof DeclarationSchema>;

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
    })
    .strict()
);
export type DeclarationWrapperSchemaType = z.infer<typeof DeclarationWrapperSchema>;
