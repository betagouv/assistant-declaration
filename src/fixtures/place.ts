import { addresses } from '@ad/src/fixtures/address';
import { PlaceSchema, PlaceSchemaType } from '@ad/src/models/entities/place';

export const places: PlaceSchemaType[] = [
  PlaceSchema.parse({
    id: 'a59cb3ba-745e-5d9a-8903-4a02327a7e01',
    name: 'Salle Hector',
    address: addresses[0],
  }),
  PlaceSchema.parse({
    id: 'a59cb3ba-745e-5d9a-8903-4a02327a7e02',
    name: 'Salle principale',
    address: addresses[1],
  }),
  PlaceSchema.parse({
    id: 'a59cb3ba-745e-5d9a-8903-4a02327a7e03',
    name: 'Dans la rue',
    address: addresses[2],
  }),
];
