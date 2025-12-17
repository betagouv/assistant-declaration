import { declarations } from '@ad/src/fixtures/declaration/common';
import { places } from '@ad/src/fixtures/place';
import { SibilDeclarationSchema, SibilDeclarationSchemaType } from '@ad/src/models/entities/declaration/sibil';
import { PerformanceTypeSchema } from '@ad/src/models/entities/event';

export const sibilDeclarations: SibilDeclarationSchemaType[] = [
  SibilDeclarationSchema.parse({
    ...declarations[0],
  }),
  SibilDeclarationSchema.parse({
    ...declarations[1],
  }),
  SibilDeclarationSchema.parse({
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
