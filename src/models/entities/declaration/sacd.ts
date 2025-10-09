import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import { EventSchema, StricterEventSchema, StricterEventSerieSchema } from '@ad/src/models/entities/event';
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
    .merge(
      z.object({
        headquartersAddress: AddressSchema,
      })
    )
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
    taxRate: true,
    expensesExcludingTaxes: true,
    introductionFeesExpensesExcludingTaxes: true,
    circusSpecificExpensesExcludingTaxes: true,
  })
    .merge(
      z.object({
        place: PlaceSchema,
      })
    )
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
      .merge(
        EventSchema.pick({
          ticketingRevenueTaxRate: true,
          // Since that's overrides there are not required
          placeCapacityOverride: true,
          audienceOverride: true,
          taxRateOverride: true,
        })
      )
      .merge(
        z.object({
          placeOverride: PlaceSchema.nullable(),
        })
      )
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
  .merge(
    EventSchema.pick({
      endAt: true,
      ticketingRevenueTaxRate: true,
    })
  )
  .merge(
    StricterEventSerieSchema.pick({
      placeCapacity: true,
      audience: true,
    })
  );
export type FlattenSacdEventSchemaType = z.infer<typeof FlattenSacdEventSchema>;
