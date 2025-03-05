import z from 'zod';

import { ticketingSystemRequiresApiAccessKey } from '@ad/src/core/ticketing/common';
import { GetterInputSchema } from '@ad/src/models/actions/common';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { TicketingSystemNameSchemaType, TicketingSystemSchema } from '@ad/src/models/entities/ticketing';
import { applyTypedParsers } from '@ad/src/utils/zod';

function preprocessDependingOnTicketingSystem(data: any, ctx: any) {
  // We tried at first to make a `OBJECT.or(OBJECT) with different systems in each and `apiAccessKey` being required or not
  // But it was messing. It's not as easy as with raw TypeScript unions. So going through a manual check simulating the real Zod error
  if (ticketingSystemRequiresApiAccessKey[data.ticketingSystemName as TicketingSystemNameSchemaType] === false && data.apiAccessKey === '') {
    // Simulate our `transformStringOrNull` we do not use since inside the `preprocess()`
    // Make sure to make a copy to not modify information from the form so it does not mess with subsequent submits
    data = { ...structuredClone(data), apiAccessKey: null };
  }

  return data;
}

const rawConnectTicketingSystemSchema = z
  .object({
    organizationId: OrganizationSchema.shape.id,
    ticketingSystemName: TicketingSystemSchema.shape.name,
    apiAccessKey: z.string().min(1).nullable(),
    apiSecretKey: z.string().min(1),
  })
  .strict();

export const ConnectTicketingSystemSchema = applyTypedParsers(z.preprocess(preprocessDependingOnTicketingSystem, rawConnectTicketingSystemSchema));
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

const rawUpdateTicketingSystemSchema = applyTypedParsers(
  z.object({
    ticketingSystemId: TicketingSystemSchema.shape.id,
    ticketingSystemName: TicketingSystemSchema.shape.name,
    apiAccessKey: rawConnectTicketingSystemSchema.shape.apiAccessKey,
    apiSecretKey: rawConnectTicketingSystemSchema.shape.apiSecretKey,
  })
);

export const UpdateTicketingSystemSchema = applyTypedParsers(z.preprocess(preprocessDependingOnTicketingSystem, rawUpdateTicketingSystemSchema));
export type UpdateTicketingSystemSchemaType = z.infer<typeof UpdateTicketingSystemSchema>;

export const UpdateTicketingSystemPrefillSchema = rawUpdateTicketingSystemSchema.deepPartial();
export type UpdateTicketingSystemPrefillSchemaType = z.infer<typeof UpdateTicketingSystemPrefillSchema>;

export const DisconnectTicketingSystemSchema = applyTypedParsers(
  z.object({
    ticketingSystemId: TicketingSystemSchema.shape.id,
  })
);
export type DisconnectTicketingSystemSchemaType = z.infer<typeof DisconnectTicketingSystemSchema>;

export const DisconnectTicketingSystemPrefillSchema = DisconnectTicketingSystemSchema.deepPartial();
export type DisconnectTicketingSystemPrefillSchemaType = z.infer<typeof DisconnectTicketingSystemPrefillSchema>;
