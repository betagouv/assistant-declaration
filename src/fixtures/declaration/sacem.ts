import { declarations } from '@ad/src/fixtures/declaration/common';
import { SacemDeclarationSchema, SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
import { PerformanceTypeSchema } from '@ad/src/models/entities/event';

export const sacemDeclarations: SacemDeclarationSchemaType[] = [
  SacemDeclarationSchema.parse({
    ...declarations[0],
  }),
  SacemDeclarationSchema.parse({
    ...declarations[1],
  }),
  SacemDeclarationSchema.parse({
    ...declarations[2],
    eventSerie: {
      ...declarations[2].eventSerie,
      performanceType: PerformanceTypeSchema.Values.DANCE,
      placeId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e44',
      placeCapacity: 100,
    },
  }),
];
