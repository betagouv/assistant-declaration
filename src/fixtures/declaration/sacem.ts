import { declarations } from '@ad/src/fixtures/declaration/common';
import { places } from '@ad/src/fixtures/place';
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
      performanceType: PerformanceTypeSchema.enum.DANCE,
      place: places[2],
      placeCapacity: 100,
    },
  }),
];
