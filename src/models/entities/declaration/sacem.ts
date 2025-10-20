import { z } from 'zod';

import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import { EventSchema, StricterEventSchema, StricterEventSerieSchema, assertValidExpenses } from '@ad/src/models/entities/event';
import { StricterOrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceSchema } from '@ad/src/models/entities/place';

// Here we take the original stored structure but forcing fields as required when needed by SACEM
export const SacemDeclarationSchema = DeclarationSchema.extend({
  organization: StricterOrganizationSchema.pick({
    id: true,
    name: true,
    officialId: true,
    officialHeadquartersId: true,
    sacemId: true,
  }).strip(),
  eventSerie: StricterEventSerieSchema.pick({
    name: true,
    performanceType: true,
    expectedDeclarationTypes: true,
    placeCapacity: true,
    audience: true,
    ticketingRevenueTaxRate: true,
    expensesIncludingTaxes: true,
    expensesExcludingTaxes: true,
    introductionFeesExpensesIncludingTaxes: true,
    introductionFeesExpensesExcludingTaxes: true,
  })
    .extend({
      place: PlaceSchema,
    })
    .superRefine((data, ctx) => {
      assertValidExpenses(data, ctx); // Had to be reapplied since we picked up a few properties
    })
    .strip(),
  events: z.array(
    StricterEventSchema.pick({
      startAt: true,
      ticketingRevenueIncludingTaxes: true,
      ticketingRevenueExcludingTaxes: true,
      consumptionsRevenueIncludingTaxes: true,
      consumptionsRevenueExcludingTaxes: true,
      cateringRevenueIncludingTaxes: true,
      cateringRevenueExcludingTaxes: true,
      programSalesRevenueIncludingTaxes: true,
      programSalesRevenueExcludingTaxes: true,
      otherRevenueIncludingTaxes: true,
      otherRevenueExcludingTaxes: true,
      freeTickets: true,
      paidTickets: true,
    })
      .extend(
        EventSchema.pick({
          consumptionsRevenueTaxRate: true,
          cateringRevenueTaxRate: true,
          programSalesRevenueTaxRate: true,
          otherRevenueTaxRate: true,
          // Since that's overrides there are not required
          placeCapacityOverride: true,
          audienceOverride: true,
          ticketingRevenueTaxRateOverride: true,
        }).shape
      )
      .extend({
        placeOverride: PlaceSchema.nullable(),
      })
      .strip()
  ),
});
export type SacemDeclarationSchemaType = z.infer<typeof SacemDeclarationSchema>;

// This is useful to avoid in multiple locations of the code trying to search for the default value to display it
// It will ensure no isolate issue over time
export const FlattenSacemEventSchema = StricterEventSchema.pick({
  startAt: true,
  ticketingRevenueIncludingTaxes: true,
  ticketingRevenueExcludingTaxes: true,
  consumptionsRevenueIncludingTaxes: true,
  consumptionsRevenueExcludingTaxes: true,
  cateringRevenueIncludingTaxes: true,
  cateringRevenueExcludingTaxes: true,
  programSalesRevenueIncludingTaxes: true,
  programSalesRevenueExcludingTaxes: true,
  otherRevenueIncludingTaxes: true,
  otherRevenueExcludingTaxes: true,
  freeTickets: true,
  paidTickets: true,
})
  .extend({
    place: PlaceSchema,
  })
  .extend(
    EventSchema.pick({
      consumptionsRevenueTaxRate: true,
      cateringRevenueTaxRate: true,
      programSalesRevenueTaxRate: true,
      otherRevenueTaxRate: true,
    }).shape
  )
  .extend(
    StricterEventSerieSchema.pick({
      placeCapacity: true,
      audience: true,
    }).shape
  );
export type FlattenSacemEventSchemaType = z.infer<typeof FlattenSacemEventSchema>;
