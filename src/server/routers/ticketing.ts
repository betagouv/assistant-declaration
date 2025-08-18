import crypto from 'crypto';

import { ticketingSystemSettings } from '@ad/src/core/ticketing/common';
import { getTicketingSystemClient } from '@ad/src/core/ticketing/instance';
import {
  ConnectTicketingSystemSchema,
  DisconnectTicketingSystemSchema,
  ListTicketingSystemsSchema,
  UpdateTicketingSystemSchema,
} from '@ad/src/models/actions/ticketing';
import {
  alreadyExistingTicketingSystemError,
  collaboratorCanOnlySeeOrganizationTicketingSystemsError,
  organizationCollaboratorRoleRequiredError,
  ticketingSystemConnectionFailedError,
  ticketingSystemNotFoundError,
  tooManyOrganizationTicketingSystemsError,
} from '@ad/src/models/entities/errors';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';
import { prisma } from '@ad/src/prisma/client';
import { ticketingSystemPrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization, isUserACollaboratorPartOfOrganizations } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

const pushStrategyTokenLength = 64;

export const ticketingRouter = router({
  connectTicketingSystem: privateProcedure.input(ConnectTicketingSystemSchema).mutation(async ({ ctx, input }) => {
    const ticketingSettings = ticketingSystemSettings[input.ticketingSystemName];

    if (!(await isUserACollaboratorPartOfOrganization(input.organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    const organizationTicketingSystemsCount = await prisma.ticketingSystem.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
      },
    });

    if (organizationTicketingSystemsCount > 10) {
      throw tooManyOrganizationTicketingSystemsError;
    }

    let apiAccessKey: string | null;
    let apiSecretKey: string;

    // Only try to match existing same identifier, and real possible connection when it's a PULL strategy
    if (ticketingSettings.strategy === 'PULL') {
      assert(input.pullStrategyCredentials);

      const sameCredentialsOrganization = await prisma.ticketingSystem.findFirst({
        where: {
          organizationId: input.organizationId,
          name: input.ticketingSystemName,
          deletedAt: null,
          ...(ticketingSettings.requiresApiAccessKey === true
            ? {
                apiAccessKey: input.pullStrategyCredentials.apiAccessKey,
              }
            : {
                apiSecretKey: input.pullStrategyCredentials.apiSecretKey,
              }),
        },
      });

      if (sameCredentialsOrganization) {
        throw alreadyExistingTicketingSystemError;
      }

      // We want to check the connection to immediately tell the user if the credentials are wrong
      const ticketingSystemClient = getTicketingSystemClient(
        {
          name: input.ticketingSystemName,
          apiAccessKey: input.pullStrategyCredentials.apiAccessKey,
          apiSecretKey: input.pullStrategyCredentials.apiSecretKey,
        },
        ctx.user.id
      );

      if (!(await ticketingSystemClient.testConnection())) {
        throw ticketingSystemConnectionFailedError;
      }

      apiAccessKey = input.pullStrategyCredentials.apiAccessKey;
      apiSecretKey = input.pullStrategyCredentials.apiSecretKey;
    } else {
      const tokenLength = 64;

      // In case of a PUSH strategy we use the ticketing system ID as identifier, and a generated readable api secret
      apiAccessKey = null;
      apiSecretKey = crypto.randomBytes(pushStrategyTokenLength / 2).toString('hex'); // 1 byte = 2 chars with hexa
    }

    const newTicketingSystem = await prisma.ticketingSystem.create({
      data: {
        organizationId: input.organizationId,
        name: input.ticketingSystemName,
        apiAccessKey: apiAccessKey,
        apiSecretKey: apiSecretKey,
      },
    });

    return {
      ticketingSystem: ticketingSystemPrismaToModel(newTicketingSystem),
      pushStrategyToken: ticketingSettings.strategy === 'PUSH' ? apiSecretKey : undefined,
    };
  }),
  listTicketingSystems: privateProcedure.input(ListTicketingSystemsSchema).query(async ({ ctx, input }) => {
    if (
      !input.filterBy.organizationIds ||
      input.filterBy.organizationIds.length !== 1 ||
      !(await isUserACollaboratorPartOfOrganizations(input.filterBy.organizationIds, ctx.user.id))
    ) {
      throw collaboratorCanOnlySeeOrganizationTicketingSystemsError;
    }

    const ticketingSystems = await prisma.ticketingSystem.findMany({
      where: {
        organizationId: input.filterBy.organizationIds
          ? {
              in: input.filterBy.organizationIds,
            }
          : undefined,
        deletedAt: null,
      },
      select: {
        // Custom getter to not fetch API credentials
        id: true,
        organizationId: true,
        name: true,
        lastSynchronizationAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    return {
      ticketingSystems: ticketingSystems.map((ticketingSystem): TicketingSystemSchemaType => {
        return ticketingSystemPrismaToModel(ticketingSystem);
      }),
    };
  }),
  updateTicketingSystem: privateProcedure.input(UpdateTicketingSystemSchema).mutation(async ({ ctx, input }) => {
    const ticketingSettings = ticketingSystemSettings[input.ticketingSystemName];

    const ticketingSystem = await prisma.ticketingSystem.findUnique({
      where: {
        id: input.ticketingSystemId,
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    if (!ticketingSystem) {
      throw ticketingSystemNotFoundError;
    } else if (!(await isUserACollaboratorPartOfOrganization(ticketingSystem.organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    // We have the `name` in the input only to properly ajust the validation on passed credentials
    assert(input.ticketingSystemName === ticketingSystem.name);

    let apiAccessKey: string | null;
    let apiSecretKey: string;

    if (ticketingSettings.strategy === 'PULL') {
      assert(input.pullStrategyCredentials);

      // We want to check the connection to immediately tell the user if the credentials are wrong
      const ticketingSystemClient = getTicketingSystemClient(
        {
          name: ticketingSystem.name,
          apiAccessKey: input.pullStrategyCredentials.apiAccessKey,
          apiSecretKey: input.pullStrategyCredentials.apiSecretKey,
        },
        ctx.user.id
      );

      if (!(await ticketingSystemClient.testConnection())) {
        throw ticketingSystemConnectionFailedError;
      }

      apiAccessKey = input.pullStrategyCredentials.apiAccessKey;
      apiSecretKey = input.pullStrategyCredentials.apiSecretKey;
    } else {
      // In case of a PUSH strategy we use the ticketing system ID as identifier, and a generated readable api secret
      apiAccessKey = null;
      apiSecretKey = crypto.randomBytes(pushStrategyTokenLength / 2).toString('hex'); // 1 byte = 2 chars with hexa
    }

    const updatedTicketingSystem = await prisma.ticketingSystem.update({
      where: {
        id: ticketingSystem.id,
      },
      data: {
        apiAccessKey: apiAccessKey,
        apiSecretKey: apiSecretKey,
      },
    });

    return {
      ticketingSystem: ticketingSystemPrismaToModel(updatedTicketingSystem),
      pushStrategyToken: ticketingSettings.strategy === 'PUSH' ? apiSecretKey : undefined,
    };
  }),
  disconnectTicketingSystem: privateProcedure.input(DisconnectTicketingSystemSchema).mutation(async ({ ctx, input }) => {
    const ticketingSystem = await prisma.ticketingSystem.findUnique({
      where: {
        id: input.ticketingSystemId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!ticketingSystem) {
      return ticketingSystemNotFoundError;
    } else if (!(await isUserACollaboratorPartOfOrganization(ticketingSystem.organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    await prisma.ticketingSystem.update({
      where: {
        id: ticketingSystem.id,
      },
      data: {
        deletedAt: new Date(),
        // Also remove credentials to reduce the risk
        apiAccessKey: null,
        apiSecretKey: null,
      },
    });
  }),
});
