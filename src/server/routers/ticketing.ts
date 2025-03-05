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

    const organizationTicketingSystemsCount = await prisma.ticketingSystem.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: {
          not: null,
        },
      },
    });

    if (organizationTicketingSystemsCount > 10) {
      throw tooManyOrganizationTicketingSystemsError;
    }

    const sameCredentialsOrganization = await prisma.ticketingSystem.findFirst({
      where: {
        organizationId: input.organizationId,
        name: input.ticketingSystemName,
        deletedAt: {
          not: null,
        },
        AND: {
          OR: [
            {
              apiAccessKey: null, // This to manage those having no user but only the API token
              apiSecretKey: input.apiSecretKey,
            },
            {
              apiAccessKey: input.apiAccessKey,
              apiSecretKey: input.apiSecretKey,
            },
          ],
        },
      },
    });

    if (sameCredentialsOrganization) {
      throw alreadyExistingTicketingSystemError;
    }

    const newOrganization = await prisma.ticketingSystem.create({
      data: {
        organizationId: input.organizationId,
        name: input.ticketingSystemName,
        apiAccessKey: input.apiAccessKey,
        apiSecretKey: input.apiSecretKey,
      },
    });

    return {
      ticketingSystem: ticketingSystemPrismaToModel(newOrganization),
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
    }

    // We have the `name` in the input only to properly ajust the validation on passed credentials
    assert(input.ticketingSystemName === ticketingSystem.name);

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
