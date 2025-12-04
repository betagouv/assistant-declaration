import { isBefore } from 'date-fns';
import z from 'zod';

import { GetterInputSchema } from '@ad/src/models/actions/common';
import { eventEndDateMustBeAfterStartDateError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
import { EventSchema, EventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { TicketingSystemSchema } from '@ad/src/models/entities/ticketing';

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

export const rawEventInputSchema = z
  .object({
    startAt: EventSchema.shape.startAt,
    endAt: EventSchema.shape.endAt,
  })
  .superRefine((data, ctx) => {
    if (data.endAt !== null && isBefore(data.endAt, data.startAt)) {
      ctx.issues.push({
        ...customErrorToZodIssue(eventEndDateMustBeAfterStartDateError, {
          overridePath: ['endAt' satisfies keyof typeof data], // Concatenated to where the `superRefine` is applied
        }),
        input: {
          startAt: data.startAt,
          endAt: data.endAt,
        },
      });
    }
  })
  .strict();

export const AddEventSerieSchema = z
  .object({
    ticketingSystemId: TicketingSystemSchema.shape.id.nullable(),
    organizationId: OrganizationSchema.shape.id, // This is needed to scope the manual ticketing system creation since it may not exist in database when the user tries using it
    name: EventSerieSchema.shape.name,
    events: z.array(rawEventInputSchema).min(1),
  })
  .strict();
export type AddEventSerieSchemaType = z.infer<typeof AddEventSerieSchema>;

export const AddEventSeriePrefillSchema = AddEventSerieSchema.partial();
export type AddEventSeriePrefillSchemaType = z.infer<typeof AddEventSeriePrefillSchema>;

export const UpdateEventSerieSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
    name: EventSerieSchema.shape.name,
    events: z
      .array(
        rawEventInputSchema.safeExtend({
          id: EventSchema.shape.id.nullable(),
        })
      )
      .min(1),
  })
  .strict();
export type UpdateEventSerieSchemaType = z.infer<typeof UpdateEventSerieSchema>;

export const UpdateEventSeriePrefillSchema = UpdateEventSerieSchema.partial();
export type UpdateEventSeriePrefillSchemaType = z.infer<typeof UpdateEventSeriePrefillSchema>;

export const RemoveEventSerieSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
  })
  .strict();
export type RemoveEventSerieSchemaType = z.infer<typeof RemoveEventSerieSchema>;

export const RemoveEventSeriePrefillSchema = RemoveEventSerieSchema.partial();
export type RemoveEventSeriePrefillSchemaType = z.infer<typeof RemoveEventSeriePrefillSchema>;
