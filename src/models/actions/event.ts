import z from 'zod';

import { GetterInputSchema } from '@ad/src/models/actions/common';
import { EventSchema, EventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';

export const SynchronizeDataFromTicketingSystemsSchema = z
  .object({
    organizationId: OrganizationSchema.shape.id,
  })
  .strict();
export type SynchronizeDataFromTicketingSystemsSchemaType = z.infer<typeof SynchronizeDataFromTicketingSystemsSchema>;

export const SynchronizeDataFromTicketingSystemsPrefillSchema = SynchronizeDataFromTicketingSystemsSchema.partial();
export type SynchronizeDataFromTicketingSystemsPrefillSchemaType = z.infer<typeof SynchronizeDataFromTicketingSystemsPrefillSchema>;

export const GetEventSerieSchema = z
  .object({
    id: EventSerieSchema.shape.id,
  })
  .strict();
export type GetEventSerieSchemaType = z.infer<typeof GetEventSerieSchema>;

export const GetEventSeriePrefillSchema = GetEventSerieSchema.partial();
export type GetEventSeriePrefillSchemaType = z.infer<typeof GetEventSeriePrefillSchema>;

export const ListEventsSeriesSchema = GetterInputSchema.extend({
  filterBy: z.object({
    organizationIds: z.array(OrganizationSchema.shape.id).nullish(),
  }),
}).strict();
export type ListEventsSeriesSchemaType = z.infer<typeof ListEventsSeriesSchema>;

export const ListEventsSeriesPrefillSchema = ListEventsSeriesSchema.partial();
export type ListEventsSeriesPrefillSchemaType = z.infer<typeof ListEventsSeriesPrefillSchema>;

export const ListEventsSchema = GetterInputSchema.extend({
  filterBy: z.object({
    eventSeriesIds: z.array(EventSchema.shape.id).nullish(),
  }),
}).strict();
export type ListEventsSchemaType = z.infer<typeof ListEventsSchema>;
