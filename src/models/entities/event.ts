import z from 'zod';

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
