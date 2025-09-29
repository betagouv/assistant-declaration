import { declarations } from '@ad/src/fixtures/declaration/common';
import { SacdDeclarationSchema, SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { PerformanceTypeSchema } from '@ad/src/models/entities/event';

export const sacdDeclarations: SacdDeclarationSchemaType[] = [
  SacdDeclarationSchema.parse({
    ...declarations[0],
  }),
  SacdDeclarationSchema.parse({
    ...declarations[1],
  }),
  SacdDeclarationSchema.parse({
    ...declarations[2],
    eventSerie: {
      ...declarations[2].eventSerie,
      performanceType: PerformanceTypeSchema.Values.DANCE,
      placeId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e44',
      placeCapacity: 100,
    },
  }),
];
