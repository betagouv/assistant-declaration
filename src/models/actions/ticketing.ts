import z from 'zod';

import { ticketingSystemRequiresApiAccessKey } from '@ad/src/core/ticketing/common';
import { GetterInputSchema } from '@ad/src/models/actions/common';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { TicketingSystemSchema } from '@ad/src/models/entities/ticketing';
import { transformStringOrNull } from '@ad/src/utils/validation';
import { applyTypedParsers } from '@ad/src/utils/zod';

const rawConnectTicketingSystemSchema = z
  .object({
    organizationId: OrganizationSchema.shape.id,
    ticketingSystemName: TicketingSystemSchema.shape.name,
    apiAccessKey: z.string().transform(transformStringOrNull),
    apiSecretKey: z.string().min(1),
  })
  .strict();

export const ConnectTicketingSystemSchema = applyTypedParsers(
  rawConnectTicketingSystemSchema.superRefine((data, ctx) => {
    // We tried at first to make a `OBJECT.or(OBJECT) with different systems in each and `apiAccessKey` being required or not
    // But it was messing. It's not as easy as with raw TypeScript unions. So going through a manual check simulating the real Zod error
    console.log(111111);
    if (ticketingSystemRequiresApiAccessKey[data.ticketingSystemName] === true && data.apiAccessKey === null) {
      console.log(22222222);
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        type: 'string',
        minimum: 1,
        inclusive: true,
        path: ['apiAccessKey'],
      });
    }
  })
);
export type ConnectTicketingSystemSchemaType = z.infer<typeof ConnectTicketingSystemSchema>;

export const ConnectTicketingSystemPrefillSchema = rawConnectTicketingSystemSchema.deepPartial();
export type ConnectTicketingSystemPrefillSchemaType = z.infer<typeof ConnectTicketingSystemPrefillSchema>;

export const ListTicketingSystemsSchema = GetterInputSchema.extend({
  filterBy: z.object({
    organizationIds: z.array(OrganizationSchema.shape.id).nullish(),
  }),
}).strict();
export type ListTicketingSystemsSchemaType = z.infer<typeof ListTicketingSystemsSchema>;

export const ListTicketingSystemsPrefillSchema = ListTicketingSystemsSchema.deepPartial();
export type ListTicketingSystemsPrefillSchemaType = z.infer<typeof ListTicketingSystemsPrefillSchema>;
