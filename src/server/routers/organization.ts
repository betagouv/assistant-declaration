import { GetOrganizationSchema } from '@ad/src/models/actions/organization';
import { organizationCollaboratorRoleRequiredError, organizationNotFoundError } from '@ad/src/models/entities/errors';
import { prisma } from '@ad/src/prisma/client';
import { organizationPrismaToModel } from '@ad/src/server/routers/mappers';
import { privateProcedure, router } from '@ad/src/server/trpc';

export async function isUserACollaboratorPartOfOrganizations(organizationIds: string[], userId: string): Promise<boolean> {
  // Remove duplicates
  organizationIds = organizationIds.filter((x, i, a) => a.indexOf(x) == i);

  const organizationsCount = await prisma.organization.count({
    where: {
      id: {
        in: organizationIds,
      },
      Collaborator: {
        some: {
          user: {
            id: userId,
          },
        },
      },
    },
  });

  return organizationIds.length === organizationsCount;
}

export async function isUserACollaboratorPartOfOrganization(organizationId: string, userId: string): Promise<boolean> {
  return await isUserACollaboratorPartOfOrganizations([organizationId], userId);
}

export async function assertUserACollaboratorPartOfOrganization(organizationId: string, userId: string): Promise<boolean> {
  if (!(await isUserACollaboratorPartOfOrganization(organizationId, userId))) {
    throw organizationCollaboratorRoleRequiredError;
  }

  return true;
}

export const organizationRouter = router({
  getOrganization: privateProcedure.input(GetOrganizationSchema).query(async ({ ctx, input }) => {
    const organizationId = input.id;

    if (!(await isUserACollaboratorPartOfOrganization(organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
    });

    if (!organization) {
      throw organizationNotFoundError;
    }

    return {
      organization: await organizationPrismaToModel(organization),
    };
  }),
});
