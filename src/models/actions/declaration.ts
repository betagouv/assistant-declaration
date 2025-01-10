import z from 'zod';

import { SacemDeclarationSchema } from '@ad/src/models/entities/declaration';

export const GetSacemDeclarationSchema = z
  .object({
    eventSerieId: SacemDeclarationSchema.shape.id,
  })
  .strict();
export type GetSacemDeclarationSchemaType = z.infer<typeof GetSacemDeclarationSchema>;

export const GetSacemDeclarationPrefillSchema = GetSacemDeclarationSchema.deepPartial();
export type GetSacemDeclarationPrefillSchemaType = z.infer<typeof GetSacemDeclarationPrefillSchema>;

export const FillSacemDeclarationSchema = z
  .object({
    eventSerieId: SacemDeclarationSchema.shape.id,
    clientId: SacemDeclarationSchema.shape.clientId,
    placeName: SacemDeclarationSchema.shape.placeName,
    placeCapacity: SacemDeclarationSchema.shape.placeCapacity,
    managerName: SacemDeclarationSchema.shape.managerName,
    managerTitle: SacemDeclarationSchema.shape.managerTitle,
    performanceType: SacemDeclarationSchema.shape.performanceType,
    declarationPlace: SacemDeclarationSchema.shape.declarationPlace,
    revenues: SacemDeclarationSchema.shape.revenues,
    expenses: SacemDeclarationSchema.shape.expenses,
  })
  .strict();
export type FillSacemDeclarationSchemaType = z.infer<typeof FillSacemDeclarationSchema>;

export const FillSacemDeclarationPrefillSchema = FillSacemDeclarationSchema.deepPartial();
export type FillSacemDeclarationPrefillSchemaType = z.infer<typeof FillSacemDeclarationPrefillSchema>;
