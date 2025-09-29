import { AddressSchema, AddressSchemaType } from '@ad/src/models/entities/address';

export const addresses: AddressSchemaType[] = [
  AddressSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e01',
    street: '1 rue de la Gare',
    city: 'Rennes',
    postalCode: '35000',
    subdivision: '',
    countryCode: 'FR',
  }),
  AddressSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e02',
    street: '2 rue de la Gare',
    city: 'Rennes',
    postalCode: '35000',
    subdivision: '',
    countryCode: 'FR',
  }),
  AddressSchema.parse({
    id: 'b79cb3ba-745e-5d9a-8903-4a02327a7e03',
    street: '3 rue de la Gare',
    city: 'Rennes',
    postalCode: '35000',
    subdivision: '',
    countryCode: 'FR',
  }),
];
