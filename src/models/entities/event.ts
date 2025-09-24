import z from 'zod';

import { DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { DeclarationSchema } from '@ad/src/models/entities/declaration';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const LiteEventSerieSchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: z.string().min(1),
      name: z.string().min(1),
      startAt: z.date(),
      endAt: z.date(),
      taxRate: z.number().nonnegative(),
    })
    .strict()
);
export type LiteEventSerieSchemaType = z.infer<typeof LiteEventSerieSchema>;

export const LiteEventSchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: z.string().min(1),
      startAt: z.date(),
      endAt: z.date(),
    })
    .strict()
);
export type LiteEventSchemaType = z.infer<typeof LiteEventSchema>;

export const LiteEventSerieWrapperSchema = applyTypedParsers(
  z
    .object({
      serie: LiteEventSerieSchema,
      events: z.array(LiteEventSchema),
    })
    .strict()
);
export type LiteEventSerieWrapperSchemaType = z.infer<typeof LiteEventSerieWrapperSchema>;

export const EventSerieSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      internalTicketingSystemId: z.string().min(1),
      ticketingSystemId: z.string().uuid(),
      name: z.string().min(1),
      startAt: z.date(),
      endAt: z.date(),
      taxRate: z.number().nonnegative(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type EventSerieSchemaType = z.infer<typeof EventSerieSchema>;

export const EventSerieWrapperSchema = applyTypedParsers(
  z
    .object({
      serie: EventSerieSchema,
      partialDeclarations: z.array(
        // This is partial declarations just to adjust the UI
        z.object({
          type: DeclarationTypeSchema,
          status: DeclarationStatusSchema,
          transmittedAt: DeclarationSchema.shape.transmittedAt,
        })
      ),
    })
    .strict()
);
export type EventSerieWrapperSchemaType = z.infer<typeof EventSerieWrapperSchema>;

export const EventSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      internalTicketingSystemId: z.string().min(1),
      eventSerieId: z.string().uuid(),
      startAt: z.date(),
      endAt: z.date(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type EventSchemaType = z.infer<typeof EventSchema>;

export const EventWrapperSchema = applyTypedParsers(
  z
    .object({
      event: EventSchema,
    })
    .strict()
);
export type EventWrapperSchemaType = z.infer<typeof EventWrapperSchema>;
