import { OrganizationSchema, OrganizationSchemaType } from '@ad/src/models/entities/organization';

export const organizations: OrganizationSchemaType[] = [
  OrganizationSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e01',
    officialId: '123456789',
    name: 'La Comédie-Française',
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  OrganizationSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e02',
    officialId: '234567891',
    name: 'Le Théâtre national de la Colline',
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
  OrganizationSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e03',
    officialId: '345678912',
    name: 'Chaillot - Théâtre national de la Danse',
    createdAt: new Date('December 17, 2024 03:24:00 UTC'),
    updatedAt: new Date('December 18, 2024 04:33:00 UTC'),
  }),
];
