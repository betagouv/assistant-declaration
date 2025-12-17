import { ticketingSystemRequiresApiAccessKey } from '@ad/src/core/ticketing/common';
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

export const ticketingRouter = router({
  connectTicketingSystem: privateProcedure.input(ConnectTicketingSystemSchema).mutation(async ({ ctx, input }) => {
    if (!(await isUserACollaboratorPartOfOrganization(input.organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    if (input.ticketingSystemName === 'MANUAL') {
      throw new Error('the manual ticketing system cannot be created from here'); // If it is in the future we should limit to 1 MANUAL only
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

    const sameCredentialsOrganization = await prisma.ticketingSystem.findFirst({
      where: {
        organizationId: input.organizationId,
        name: input.ticketingSystemName,
        deletedAt: null,
        ...(ticketingSystemRequiresApiAccessKey[input.ticketingSystemName] === true
          ? {
              apiAccessKey: input.apiAccessKey,
            }
          : {
              apiSecretKey: input.apiSecretKey,
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
        apiAccessKey: input.apiAccessKey,
        apiSecretKey: input.apiSecretKey,
      },
      ctx.user.id
    );

    if (!(await ticketingSystemClient.testConnection())) {
      throw ticketingSystemConnectionFailedError;
    }

    const newTicketingSystem = await prisma.ticketingSystem.create({
      data: {
        organizationId: input.organizationId,
        name: input.ticketingSystemName,
        apiAccessKey: input.apiAccessKey,
        apiSecretKey: input.apiSecretKey,
      },
    });

    return {
      ticketingSystem: ticketingSystemPrismaToModel(newTicketingSystem),
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
      return ticketingSystemNotFoundError;
    } else if (!(await isUserACollaboratorPartOfOrganization(ticketingSystem.organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    } else if (ticketingSystem.name === 'MANUAL') {
      throw new Error('the manual ticketing system cannot be updated');
    }

    // We have the `name` in the input only to properly ajust the validation on passed credentials
    assert(input.ticketingSystemName === ticketingSystem.name);

    // We want to check the connection to immediately tell the user if the credentials are wrong
    const ticketingSystemClient = getTicketingSystemClient(
      {
        name: ticketingSystem.name,
        apiAccessKey: input.apiAccessKey,
        apiSecretKey: input.apiSecretKey,
      },
      ctx.user.id
    );

    if (!(await ticketingSystemClient.testConnection())) {
      throw ticketingSystemConnectionFailedError;
    }

    const updatedTicketingSystem = await prisma.ticketingSystem.update({
      where: {
        id: ticketingSystem.id,
      },
      data: {
        apiAccessKey: input.apiAccessKey,
        apiSecretKey: input.apiSecretKey,
      },
    });

    return {
      ticketingSystem: ticketingSystemPrismaToModel(updatedTicketingSystem),
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
