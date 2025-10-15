import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { EventSchema, EventSerieSchema, StricterEventSerieSchema, assertValidExpenses } from '@ad/src/models/entities/event';
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
        introductionFeesExpensesIncludingTaxes: true,
        introductionFeesExpensesExcludingTaxes: true,
        circusSpecificExpensesIncludingTaxes: true,
        circusSpecificExpensesExcludingTaxes: true,
      }).safeExtend({
        place: PlaceSchema.nullable(),
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
        }).extend({
          placeOverride: PlaceSchema.nullable(),
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
      eventSerie: DeclarationSchema.shape.eventSerie
        .extend({
          place: PlaceInputSchema,
        })
        .superRefine((data, ctx) => {
          assertValidExpenses(data, ctx); // Needed since `extend` reset refinements
        }),
      events: z.array(
        DeclarationSchema.shape.events.element.extend({
          placeOverride: PlaceInputSchema,
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
    })
    .strict()
);
export type DeclarationWrapperSchemaType = z.infer<typeof DeclarationWrapperSchema>;
