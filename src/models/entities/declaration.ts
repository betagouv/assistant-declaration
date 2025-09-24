import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
import { EventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const DeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: z.string().uuid(),
      status: DeclarationStatusSchema,
      transmittedAt: z.date().nullable(),
      // Settable properties
      clientId: z.string().min(1).max(100),
      placeName: z.string().min(1).max(150),
      placeCapacity: z.number().int().nonnegative(),
      placePostalCode: AddressSchema.shape.postalCode,
      managerName: z.string().min(1).max(150),
      managerTitle: z.string().min(1).max(150),
      performanceType: z.string().min(1).max(250),
      declarationPlace: z.string().min(1).max(250),
      // Computed properties
      organizationName: OrganizationSchema.shape.name,
      eventSerieName: EventSerieSchema.shape.name,
      eventSerieStartAt: EventSerieSchema.shape.startAt,
      eventSerieEndAt: EventSerieSchema.shape.endAt,
      eventsCount: z.number().int().nonnegative(),
      paidTickets: z.number().int().nonnegative(),
      freeTickets: z.number().int().nonnegative(),
    })
    .strict()
);
export type DeclarationSchemaType = z.infer<typeof DeclarationSchema>;
