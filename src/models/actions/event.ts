import { isBefore } from 'date-fns';
import z from 'zod';

import { GetterInputSchema } from '@ad/src/models/actions/common';
import { supersoniksAccessKeyInvalidDomainNameError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
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

export const rawEventInputSchema = z
  .object({
    startAt: EventSchema.shape.startAt,
    endAt: EventSchema.shape.endAt,
  })
  .superRefine((data, ctx) => {
    if (data.endAt !== null && isBefore(data.endAt, data.startAt)) {
      ctx.issues.push({
        ...customErrorToZodIssue(supersoniksAccessKeyInvalidDomainNameError),
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
    organizationId: OrganizationSchema.shape.id,
    name: EventSerieSchema.shape.name,
    events: z.array(rawEventInputSchema).min(1),
  })
  .strict();
export type AddEventSerieSchemaType = z.infer<typeof AddEventSerieSchema>;

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

export const RemoveEventSerieSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
  })
  .strict();
export type RemoveEventSerieSchemaType = z.infer<typeof RemoveEventSerieSchema>;
