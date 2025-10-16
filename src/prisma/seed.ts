import { PrismaClient, TicketingSystemName } from '@prisma/client';

import { seedProductionDataIntoDatabase } from '@ad/src/prisma/production-seed';

export async function truncateDatabase(prismaClient: PrismaClient) {
  const tablenames = await prismaClient.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prismaClient.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
}

export async function seedDatabase(prismaClient: PrismaClient) {
  // Empty all tables to avoid managing upserts+conditions+fixedUuids
  await truncateDatabase(prismaClient);

  // Add predefined production data as samples too
  await seedProductionDataIntoDatabase(prismaClient);

  const testUserId = '5c03994c-fc16-47e0-bd02-d218a370a078';

  // Create main user
  const mainUser = await prismaClient.user.upsert({
    where: {
      id: testUserId,
    },
    create: {
      id: testUserId,
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@domain.demo',
      status: 'CONFIRMED',
      profilePicture: null,
      Admin: {
        create: {
          canEverything: true,
        },
      },
      Secrets: {
        create: {
          passwordHash: '$2a$11$L2SjShQuoJoYqMPmoINuWeRLRWnzNuQf22.VgculPIlpnS8bleLEG', // Value: "test"
        },
      },
    },
    update: {},
  });

  // Create organization
  const coucouOrganization = await prismaClient.organization.create({
    data: {
      name: 'Les spectacles de Coucou',
      officialId: '123456789',
      officialHeadquartersId: '12345678900011',
      headquartersAddress: {
        create: {
          street: '1 rue de la Gare',
          city: 'Rennes',
          postalCode: '35000',
          subdivision: '',
          countryCode: 'FR',
        },
      },
    },
  });

  // Add the main user as a collaborator in an organization
  const coucouCollaborator = await prismaClient.collaborator.create({
    data: {
      user: {
        connect: {
          id: mainUser.id,
        },
      },
      organization: {
        connect: {
          id: coucouOrganization.id,
        },
      },
    },
  });

  // Add ticketing system
  const coucouMainTicketingSystem = await prismaClient.ticketingSystem.create({
    data: {
      organizationId: coucouOrganization.id,
      name: TicketingSystemName.BILLETWEB,
      apiAccessKey: 'failing-one',
      apiSecretKey: 'failing-one',
      lastSynchronizationAt: null,
      forceNextSynchronizationFrom: null,
      lastProcessingError: null,
      lastProcessingErrorAt: null,
    },
  });
}
