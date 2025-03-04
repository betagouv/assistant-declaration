import { ConnectTicketingSystemSchema, ListTicketingSystemsSchema } from '@ad/src/models/actions/ticketing';
import {
  collaboratorCanOnlySeeOrganizationTicketingSystemsError,
  organizationCollaboratorRoleRequiredError,
  tooManyOrganizationTicketingSystemsError,
} from '@ad/src/models/entities/errors';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';
import { prisma } from '@ad/src/prisma/client';
import { ticketingSystemPrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization, isUserACollaboratorPartOfOrganizations } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';

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
});
