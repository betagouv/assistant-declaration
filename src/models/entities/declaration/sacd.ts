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
      ticketingRevenueTaxRate: true,
      freeTickets: true,
      paidTickets: true,
    }).merge(
      // Since that's overrides there are not required
      EventSchema.pick({
        placeOverrideId: true,
        placeCapacityOverride: true,
        audienceOverride: true,
        taxRateOverride: true,
      })
    )
  ),
});
export type SacdDeclarationSchemaType = z.infer<typeof SacdDeclarationSchema>;
