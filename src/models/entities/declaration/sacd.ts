import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import {
  EventSchema,
  StricterEventSchema,
  StricterEventSerieSchema,
  assertAmountsRespectTaxLogic,
  assertValidExpenses,
} from '@ad/src/models/entities/event';
import { StricterOrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceSchema } from '@ad/src/models/entities/place';

// Here we take the original stored structure but forcing fields as required when needed by SACD
export const SacdDeclarationSchema = DeclarationSchema.extend({
  organization: StricterOrganizationSchema.pick({
    id: true,
    name: true,
    officialId: true,
    sacdId: true,
  })
    .extend({
      headquartersAddress: AddressSchema,
    })
    .strip(),
  eventSerie: StricterEventSerieSchema.pick({
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
  })
    .extend({
      place: PlaceSchema,
    })
    .superRefine((data, ctx) => {
      // Had to be reapplied since we picked up a few properties
      assertValidExpenses(data, ctx);
      assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
    })
    .strip(),
  events: z.array(
    StricterEventSchema.pick({
      id: true,
      startAt: true,
      endAt: true,
      ticketingRevenueIncludingTaxes: true,
      ticketingRevenueExcludingTaxes: true,
      freeTickets: true,
      paidTickets: true,
    })
      .extend(
        EventSchema.pick({
          // Since that's overrides there are not required
          placeCapacityOverride: true,
          audienceOverride: true,
          ticketingRevenueTaxRateOverride: true,
        }).shape
      )
      .extend({
        placeOverride: PlaceSchema.nullable(),
      })
      .superRefine((data, ctx) => {
        // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
        assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
      })
      .strip()
  ),
});
export type SacdDeclarationSchemaType = z.infer<typeof SacdDeclarationSchema>;

// This is useful to avoid in multiple locations of the code trying to search for the default value to display it
// It will ensure no isolate issue over time
export const FlattenSacdEventSchema = StricterEventSchema.pick({
  id: true,
  startAt: true,
  ticketingRevenueIncludingTaxes: true,
  ticketingRevenueExcludingTaxes: true,
  freeTickets: true,
  paidTickets: true,
})
  .extend({
    place: PlaceSchema,
  })
  .extend(
    EventSchema.pick({
      endAt: true,
    }).shape
  )
  .extend(
    StricterEventSerieSchema.pick({
      placeCapacity: true,
      audience: true,
    }).shape
  );
export type FlattenSacdEventSchemaType = z.infer<typeof FlattenSacdEventSchema>;
