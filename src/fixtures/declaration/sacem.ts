import { declarations } from '@ad/src/fixtures/declaration/common';
import { SacemDeclarationSchema, SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';

export const sacemDeclarations: SacemDeclarationSchemaType[] = [
  SacemDeclarationSchema.parse({
    ...declarations[0],
  }),
  SacemDeclarationSchema.parse({
    ...declarations[1],
  }),
  SacemDeclarationSchema.parse({
    ...declarations[2],
  }),
];
