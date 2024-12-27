import z from 'zod';

import { DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/declaration';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const LiteEventSerieSchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: z.string().min(1),
      name: z.string().min(1),
      startAt: z.date(),
      endAt: z.date(),
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

export const LiteTicketCategorySchema = applyTypedParsers(
  z
    .object({
      internalTicketingSystemId: z.string().min(1),
      name: z.string().min(1),
      description: z.string().min(1).nullable(),
      price: z.number().nonnegative(),
    })
    .strict()
);
export type LiteTicketCategorySchemaType = z.infer<typeof LiteTicketCategorySchema>;

export const LiteEventSalesSchema = applyTypedParsers(
  z
    .object({
      internalEventTicketingSystemId: z.string().min(1),
      internalTicketCategoryTicketingSystemId: z.string().min(1),
      total: z.number().nonnegative(),
    })
    .strict()
);
export type LiteEventSalesSchemaType = z.infer<typeof LiteEventSalesSchema>;

export const LiteEventSerieWrapperSchema = applyTypedParsers(
  z
    .object({
      serie: LiteEventSerieSchema,
      ticketCategories: z.array(LiteTicketCategorySchema),
      events: z.array(LiteEventSchema),
      sales: z.array(LiteEventSalesSchema),
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

export const TicketCategorySchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      internalTicketingSystemId: z.string().min(1),
      eventSerieId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().min(1).nullable(),
      price: z.number().nonnegative(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type TicketCategorySchemaType = z.infer<typeof TicketCategorySchema>;

export const EventCategoryTicketsSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
      categoryId: z.string().uuid(),
      total: z.number().int().nonnegative(),
      totalOverride: z.number().int().nonnegative().nullable(),
      priceOverride: z.number().nonnegative().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .strict()
);
export type EventCategoryTicketsSchemaType = z.infer<typeof EventCategoryTicketsSchema>;

export const SalesWrapperSchema = applyTypedParsers(
  z
    .object({
      ticketCategory: TicketCategorySchema,
      eventCategoryTickets: EventCategoryTicketsSchema,
    })
    .strict()
);
export type SalesWrapperSchemaType = z.infer<typeof SalesWrapperSchema>;

export const EventWrapperSchema = applyTypedParsers(
  z
    .object({
      event: EventSchema,
      sales: z.array(SalesWrapperSchema),
    })
    .strict()
);
export type EventWrapperSchemaType = z.infer<typeof EventWrapperSchema>;
