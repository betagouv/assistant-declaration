import { z } from 'zod';

import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import { EventSchema, StricterEventSchema, StricterEventSerieSchema } from '@ad/src/models/entities/event';
import { StricterOrganizationSchema } from '@ad/src/models/entities/organization';

// Here we take the original stored structure but forcing fields as required when needed by Sacem
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
    placeId: true,
    placeCapacity: true,
    audience: true,
    taxRate: true,
    expensesAmount: true,
  }).strip(),
  events: z.array(
    StricterEventSchema.pick({
      startAt: true,
      ticketingRevenueIncludingTaxes: true,
      ticketingRevenueExcludingTaxes: true,
      ticketingRevenueTaxRate: true,
      freeTickets: true,
      paidTickets: true,
    })
      .merge(
        EventSchema.pick({
          ticketingRevenueTaxRate: true,
          // Since that's overrides there are not required
          placeOverrideId: true,
          placeCapacityOverride: true,
          audienceOverride: true,
          taxRateOverride: true,
        })
      )
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
  freeTickets: true,
  paidTickets: true,
})
  .merge(
    EventSchema.pick({
      ticketingRevenueTaxRate: true,
    })
  )
  .merge(
    StricterEventSerieSchema.pick({
      placeId: true,
      placeCapacity: true,
      audience: true,
    })
  );
export type FlattenSacemEventSchemaType = z.infer<typeof FlattenSacemEventSchema>;
