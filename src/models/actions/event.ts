import z from 'zod';

import { GetterInputSchema } from '@ad/src/models/actions/common';
import { EventCategoryTicketsSchema, EventSchema, EventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const SynchronizeDataFromTicketingSystemsSchema = z
  .object({
    organizationId: OrganizationSchema.shape.id,
  })
  .strict();
export type SynchronizeDataFromTicketingSystemsSchemaType = z.infer<typeof SynchronizeDataFromTicketingSystemsSchema>;

export const SynchronizeDataFromTicketingSystemsPrefillSchema = SynchronizeDataFromTicketingSystemsSchema.deepPartial();
export type SynchronizeDataFromTicketingSystemsPrefillSchemaType = z.infer<typeof SynchronizeDataFromTicketingSystemsPrefillSchema>;

export const GetEventSerieSchema = z
  .object({
    id: EventSerieSchema.shape.id,
  })
  .strict();
export type GetEventSerieSchemaType = z.infer<typeof GetEventSerieSchema>;

export const GetEventSeriePrefillSchema = GetEventSerieSchema.deepPartial();
export type GetEventSeriePrefillSchemaType = z.infer<typeof GetEventSeriePrefillSchema>;

export const ListEventsSeriesSchema = GetterInputSchema.extend({
  filterBy: z.object({
    organizationIds: z.array(OrganizationSchema.shape.id).nullish(),
  }),
}).strict();
export type ListEventsSeriesSchemaType = z.infer<typeof ListEventsSeriesSchema>;

export const ListEventsSeriesPrefillSchema = ListEventsSeriesSchema.deepPartial();
export type ListEventsSeriesPrefillSchemaType = z.infer<typeof ListEventsSeriesPrefillSchema>;

export const ListEventsSchema = GetterInputSchema.extend({
  filterBy: z.object({
    eventSeriesIds: z.array(EventSchema.shape.id).nullish(),
  }),
}).strict();
export type ListEventsSchemaType = z.infer<typeof ListEventsSchema>;

export const ListEventsPrefillSchema = ListEventsSchema.deepPartial();
export type ListEventsPrefillSchemaType = z.infer<typeof ListEventsPrefillSchema>;

export const UpdateEventCategoryTicketsSchema = z
  .object({
    eventCategoryTicketsId: EventCategoryTicketsSchema.shape.id,
    totalOverride: EventCategoryTicketsSchema.shape.totalOverride,
    priceOverride: EventCategoryTicketsSchema.shape.priceOverride,
  })
  .strict();
export type UpdateEventCategoryTicketsSchemaType = z.infer<typeof UpdateEventCategoryTicketsSchema>;

export const UpdateEventCategoryTicketsPrefillSchema = UpdateEventCategoryTicketsSchema.deepPartial();
export type UpdateEventCategoryTicketsPrefillSchemaType = z.infer<typeof UpdateEventCategoryTicketsPrefillSchema>;
