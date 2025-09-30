import { z } from 'zod';

import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import { EventSchema, StricterEventSchema, StricterEventSerieSchema } from '@ad/src/models/entities/event';
import { StricterOrganizationSchema } from '@ad/src/models/entities/organization';

// Here we take the original stored structure but forcing fields as required when needed by SACD
export const SacdDeclarationSchema = DeclarationSchema.extend({
  organization: StricterOrganizationSchema.pick({
    id: true,
    name: true,
    sacdId: true,
  }),
  eventSerie: StricterEventSerieSchema.pick({
    name: true,
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
    StricterEventSchema.pick({
      startAt: true,
      endAt: true,
      ticketingRevenueIncludingTaxes: true,
      ticketingRevenueExcludingTaxes: true,
      freeTickets: true,
      paidTickets: true,
    }).merge(
      EventSchema.pick({
        ticketingRevenueTaxRate: true,
        // Since that's overrides there are not required
        placeOverrideId: true,
        placeCapacityOverride: true,
        audienceOverride: true,
        taxRateOverride: true,
      })
    )
  ),
}).strip();
export type SacdDeclarationSchemaType = z.infer<typeof SacdDeclarationSchema>;

// This is useful to avoid in multiple locations of the code trying to search for the default value to display it
// It will ensure no isolate issue over time
export const FlattenSacdEventSchema = StricterEventSchema.pick({
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
export type FlattenSacdEventSchemaType = z.infer<typeof FlattenSacdEventSchema>;
