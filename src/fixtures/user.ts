import { UserSchema, UserSchemaType, UserStatusSchema } from '@ad/src/models/entities/user';

export const users: UserSchemaType[] = [
  UserSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e01',
    firstname: 'Romain',
    lastname: 'Garcia',
    email: 'germaine38@hotmail.fr',
    status: UserStatusSchema.enum.CONFIRMED,
    lastActivityAt: new Date('December 19, 2022 04:33:00 UTC'),
    createdAt: new Date('December 17, 2022 03:24:00 UTC'),
    updatedAt: new Date('December 19, 2022 04:33:00 UTC'),
  }),
  UserSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e02',
    firstname: 'Aminte',
    lastname: 'Bertrand',
    email: 'justine.blanchard@hotmail.fr',
    status: UserStatusSchema.enum.CONFIRMED,
    lastActivityAt: new Date('December 19, 2022 04:33:00 UTC'),
    createdAt: new Date('December 17, 2022 03:24:00 UTC'),
    updatedAt: new Date('December 19, 2022 04:33:00 UTC'),
  }),
  UserSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e03',
    firstname: 'Agathon',
    lastname: 'Louis',
    email: 'aure.benoit71@hotmail.fr',
    status: UserStatusSchema.enum.CONFIRMED,
    lastActivityAt: new Date('December 19, 2022 04:33:00 UTC'),
    createdAt: new Date('December 17, 2022 03:24:00 UTC'),
    updatedAt: new Date('December 19, 2022 04:33:00 UTC'),
  }),
];
