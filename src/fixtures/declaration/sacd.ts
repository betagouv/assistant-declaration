import { declarations } from '@ad/src/fixtures/declaration/common';
import { places } from '@ad/src/fixtures/place';
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
      producerOfficialId: '123456789',
      producerName: 'Les studios Culture',
      performanceType: PerformanceTypeSchema.enum.DANCE,
      place: places[2],
      placeCapacity: 100,
    },
  }),
];
