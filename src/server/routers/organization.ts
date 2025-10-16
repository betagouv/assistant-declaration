import { CreateOrganizationSchema, GetOrganizationSchema } from '@ad/src/models/actions/organization';
import {
  anotherOrganizationAlreadyHasThisOfficialIdError,
  multipleUserOrganizationsCreationError,
  organizationCollaboratorRoleRequiredError,
  organizationMaskedAddressError,
  organizationNotFoundError,
} from '@ad/src/models/entities/errors';
import { prisma } from '@ad/src/prisma/client';
import { searchCompanySuggestions } from '@ad/src/proxies/api-gouv-fr';
import { searchAddressSuggestions } from '@ad/src/proxies/national-address-base';
import { organizationPrismaToModel } from '@ad/src/server/routers/mappers';
import { privateProcedure, router } from '@ad/src/server/trpc';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

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
  createOrganization: privateProcedure.input(CreateOrganizationSchema).mutation(async ({ ctx, input }) => {
    // Retrieve information from the official directory to make sure of the SIREN but also to get the address from the BAN
    // Note: relying on external information from backend complicates things and make the platform depends on them but it was
    // asked to ease the UI (and we cannot just assume input data would be coherent for organization creation...)
    const companySuggestions = await searchCompanySuggestions(input.officialHeadquartersId);
    const expectedCompany = companySuggestions.find((companySuggestion) => companySuggestion.officialHeadquartersId === input.officialHeadquartersId);

    if (!expectedCompany || expectedCompany.inlineHeadquartersAddress === '') {
      throw new Error('the company headquarters id cannot be verified');
    } else if (expectedCompany.inlineHeadquartersAddress === '[NON-DIFFUSIBLE]') {
      throw organizationMaskedAddressError;
    }

    const officialId = expectedCompany.officialId;

    const existingOrganization = await prisma.organization.findFirst({
      where: {
        OR: [
          {
            officialHeadquartersId: input.officialHeadquartersId,
          },
          {
            officialId: officialId,
          },
        ],
      },
    });

    if (existingOrganization) {
      throw anotherOrganizationAlreadyHasThisOfficialIdError;
    }

    const userOrganizationsCount = await prisma.organization.count({
      where: {
        Collaborator: {
          some: {
            userId: ctx.user.id,
          },
        },
      },
    });

    if (userOrganizationsCount > 0) {
      throw multipleUserOrganizationsCreationError;
    }

    // `geo_adresse` and `geo_id` was not guaranteed to be found from the company directory, so it may use the default `adresse` format that is a bit different
    // so we have to rely on a query on not an exact ID match to retrieve parts of the address
    const headquartersAddressSuggestions = await searchAddressSuggestions(expectedCompany.inlineHeadquartersAddress);

    assert(headquartersAddressSuggestions.length > 0, 'no listed address from the inline company raw address');

    const headquartersAddress = headquartersAddressSuggestions[0];

    const newOrganization = await prisma.organization.create({
      data: {
        name: input.name,
        officialId: officialId,
        officialHeadquartersId: input.officialHeadquartersId,
        headquartersAddress: {
          create: {
            street: headquartersAddress.street,
            city: headquartersAddress.city,
            postalCode: headquartersAddress.postalCode,
            subdivision: headquartersAddress.subdivision,
            countryCode: headquartersAddress.countryCode,
          },
        },
        Collaborator: {
          create: {
            userId: ctx.user.id,
          },
        },
      },
    });

    return {
      organization: organizationPrismaToModel(newOrganization),
    };
  }),
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
      organization: organizationPrismaToModel(organization),
    };
  }),
});
