import z from 'zod';

import { ticketingSystemSettings } from '@ad/src/core/ticketing/common';
import { GetterInputSchema } from '@ad/src/models/actions/common';
import { invalidTicketingSystemCredentialsError, supersoniksAccessKeyInvalidDomainNameError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { TicketingSystemNameSchemaType, TicketingSystemSchema } from '@ad/src/models/entities/ticketing';
import { applyTypedParsers } from '@ad/src/utils/zod';

const domainNameRegexp = /^(?!:\/\/)([a-zA-Z0-9-_]{1,63}\.)+[a-zA-Z]{2,63}$/; // Should accept most case, the idea is to avoid people passing things like /:?= ...

function preprocessDependingOnTicketingSystem(data: any, ctx: any) {
  // We tried at first to make a `OBJECT.or(OBJECT) with different systems in each and `apiAccessKey` being required or not
  // But it was messing. It's not as easy as with raw TypeScript unions. So going through a manual check simulating the real Zod error
  //
  // Simulate our `transformStringOrNull` we do not use since inside the `preprocess()`
  // Make sure to make a copy to not modify information from the form so it does not mess with subsequent submits
  const ticketingSettings = ticketingSystemSettings[data.ticketingSystemName as TicketingSystemNameSchemaType];

  if (ticketingSettings.strategy === 'PUSH') {
    data = { ...structuredClone(data), pullStrategyCredentials: null };
  } else if (ticketingSettings.requiresApiAccessKey === false && data.apiAccessKey === '') {
    data = {
      ...structuredClone(data),
      pullStrategyCredentials: {
        ...data.pullStrategyCredentials,
        apiAccessKey: null,
      },
    };
  }

  return data;
}

const rawConnectTicketingSystemSchema = z
  .object({
    organizationId: OrganizationSchema.shape.id,
    ticketingSystemName: TicketingSystemSchema.shape.name,
    pullStrategyCredentials: z
      .object({
        apiAccessKey: z.string().min(1).nullable(),
        apiSecretKey: z.string().min(1),
      })
      .nullable(),
  })
  .strict();

export const ConnectTicketingSystemSchema = applyTypedParsers(
  z.preprocess(
    preprocessDependingOnTicketingSystem,
    rawConnectTicketingSystemSchema.superRefine((data, ctx) => {
      const ticketingSettings = ticketingSystemSettings[data.ticketingSystemName as TicketingSystemNameSchemaType];

      // Since managing PULL and PUSH strategies within the same mutation, we make sure of the logic
      if (
        (ticketingSettings.strategy === 'PULL' && data.pullStrategyCredentials === null) ||
        (ticketingSettings.strategy === 'PUSH' && data.pullStrategyCredentials !== null)
      ) {
        ctx.addIssue(customErrorToZodIssue(invalidTicketingSystemCredentialsError));
      }

      if (
        (data.ticketingSystemName === 'SUPERSONIKS' || data.ticketingSystemName === 'SOTICKET') &&
        data.pullStrategyCredentials?.apiAccessKey &&
        !domainNameRegexp.test(data.pullStrategyCredentials.apiAccessKey)
      ) {
        ctx.addIssue(customErrorToZodIssue(supersoniksAccessKeyInvalidDomainNameError));
      }
    })
  )
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

const rawUpdateTicketingSystemSchema = applyTypedParsers(
  z.object({
    ticketingSystemId: TicketingSystemSchema.shape.id,
    ticketingSystemName: TicketingSystemSchema.shape.name,
    pullStrategyCredentials: rawConnectTicketingSystemSchema.shape.pullStrategyCredentials,
  })
);

export const UpdateTicketingSystemSchema = applyTypedParsers(
  z.preprocess(
    preprocessDependingOnTicketingSystem, // Despite this transformer, if PUSH strategy is used it will be reject by the endpoint
    rawUpdateTicketingSystemSchema.superRefine((data, ctx) => {
      const ticketingSettings = ticketingSystemSettings[data.ticketingSystemName as TicketingSystemNameSchemaType];

      if (
        (data.ticketingSystemName === 'SUPERSONIKS' || data.ticketingSystemName === 'SOTICKET') &&
        data.pullStrategyCredentials?.apiAccessKey &&
        !domainNameRegexp.test(data.pullStrategyCredentials.apiAccessKey)
      ) {
        ctx.addIssue(customErrorToZodIssue(supersoniksAccessKeyInvalidDomainNameError));
      }

      // Since managing PULL and PUSH strategies within the same mutation, we make sure of the logic
      if (
        (ticketingSettings.strategy === 'PULL' && data.pullStrategyCredentials === null) ||
        (ticketingSettings.strategy === 'PUSH' && data.pullStrategyCredentials !== null)
      ) {
        ctx.addIssue(customErrorToZodIssue(invalidTicketingSystemCredentialsError));
      }
    })
  )
);
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
