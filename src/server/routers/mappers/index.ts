import { Organization, User } from '@prisma/client';

import { OrganizationSchemaType } from '@ad/src/models/entities/organization';
import { UserSchemaType } from '@ad/src/models/entities/user';

export function userPrismaToModel(user: User): UserSchemaType {
  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    status: user.status,
    lastActivityAt: user.lastActivityAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function organizationPrismaToModel(organization: Organization): Promise<OrganizationSchemaType> {
  return {
    id: organization.id,
    officialId: organization.officialId,
    name: organization.name,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}
