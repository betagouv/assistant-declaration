import { ListTicketingSystemsSchema } from '@ad/src/models/actions/ticketing';
import { collaboratorCanOnlySeeOrganizationTicketingSystemsError } from '@ad/src/models/entities/errors';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';
import { prisma } from '@ad/src/prisma/client';
import { ticketingSystemPrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganizations } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';

export const ticketingRouter = router({
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
