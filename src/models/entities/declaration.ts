import { z } from 'zod';

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
    })
    .strict()
);
export type DeclarationSchemaType = z.infer<typeof DeclarationSchema>;

export const SacemDeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: z.string().uuid(),
      // Settable properties
      clientId: z.string().min(1).max(100),
      placeName: z.string().min(1).max(150),
      placeCapacity: z.number().int().nonnegative(),
      managerName: z.string().min(1).max(150),
      managerTitle: z.string().min(1).max(150),
      // Computed properties
      organizationName: OrganizationSchema.shape.name,
      eventSerieName: EventSerieSchema.shape.name,
      eventSerieStartAt: EventSerieSchema.shape.startAt,
      eventSerieEndAt: EventSerieSchema.shape.endAt,
      eventsCount: z.number().int().nonnegative(),
      paidTickets: z.number().int().nonnegative(),
      freeTickets: z.number().int().nonnegative(),
      includingTaxesAmount: z.number().nonnegative(),
      excludingTaxesAmount: z.number().nonnegative(),
    })
    .strict()
);
export type SacemDeclarationSchemaType = z.infer<typeof SacemDeclarationSchema>;

SacemDeclarationSchema.pick({
  clientId: true,
});

export const SacemDeclarationWrapperSchema = applyTypedParsers(
  z
    .object({
      declaration: SacemDeclarationSchema.nullable(),
      // In case the declaration does not yet exist we pass to the frontend some fields for the UI to help creating the declaration
      placeholder: SacemDeclarationSchema.pick({
        organizationName: true,
        eventSerieName: true,
        eventSerieStartAt: true,
        eventSerieEndAt: true,
        eventsCount: true,
        paidTickets: true,
        freeTickets: true,
        includingTaxesAmount: true,
        excludingTaxesAmount: true,
      }).extend({
        clientId: z.array(SacemDeclarationSchema.shape.clientId),
        placeName: z.array(SacemDeclarationSchema.shape.placeName),
        placeCapacity: z.array(SacemDeclarationSchema.shape.placeCapacity),
        managerName: z.array(SacemDeclarationSchema.shape.managerName),
        managerTitle: z.array(SacemDeclarationSchema.shape.managerTitle),
      }),
    })
    .strict()
);
export type SacemDeclarationWrapperSchemaType = z.infer<typeof SacemDeclarationWrapperSchema>;
