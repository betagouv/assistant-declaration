import { declarations } from '@ad/src/fixtures/declaration/common';
import { SacdDeclarationSchema, SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';

export const sacdDeclarations: SacdDeclarationSchemaType[] = [
  SacdDeclarationSchema.parse({
    ...declarations[0],
  }),
  SacdDeclarationSchema.parse({
    ...declarations[1],
  }),
  SacdDeclarationSchema.parse({
    ...declarations[2],
  }),
];
