import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import { EventSchema, StricterEventSchema, StricterEventSerieSchema, assertAmountsRespectTaxLogic } from '@ad/src/models/entities/event';
import { StricterOrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceSchema } from '@ad/src/models/entities/place';

// Here we take the original stored structure but forcing fields as required when needed by SACD
export const SibilDeclarationSchema = DeclarationSchema.extend({
  organization: StricterOrganizationSchema.pick({
    id: true,
    name: true,
    officialId: true,
    sibilUsername: true,
    sibilPassword: true,
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
    placeCapacity: true,
    audience: true,
  })
    .extend({
      place: PlaceSchema,
    })
    .superRefine((data, ctx) => {
      // None in this case
    })
    .strip(),
  events: z.array(
    StricterEventSchema.pick({
      id: true,
      startAt: true,
      ticketingRevenueIncludingTaxes: true,
      ticketingRevenueExcludingTaxes: true,
      freeTickets: true,
      paidTickets: true,
    })
      .extend(
        EventSchema.pick({
          endAt: true,
          // Since that's overrides there are not required
          placeCapacityOverride: true,
          audienceOverride: true,
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
export type SibilDeclarationSchemaType = z.infer<typeof SibilDeclarationSchema>;

// This is useful to avoid in multiple locations of the code trying to search for the default value to display it
// It will ensure no isolate issue over time
export const FlattenSibilEventSchema = StricterEventSchema.pick({
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
export type FlattenSibilEventSchemaType = z.infer<typeof FlattenSibilEventSchema>;
