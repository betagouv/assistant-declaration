import z from 'zod';

import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { DeclarationSchema } from '@ad/src/models/entities/declaration';
import { EventSerieSchema } from '@ad/src/models/entities/event';

export const TransmitDeclarationSchema = z
  .object({
    eventSerieId: DeclarationSchema.shape.eventSerieId,
    type: DeclarationTypeSchema,
  })
  .strict();
export type TransmitDeclarationSchemaType = z.infer<typeof TransmitDeclarationSchema>;

export const GetDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
  })
  .strict();
export type GetDeclarationSchemaType = z.infer<typeof GetDeclarationSchema>;

export const GetDeclarationPrefillSchema = GetDeclarationSchema.deepPartial();
export type GetDeclarationPrefillSchemaType = z.infer<typeof GetDeclarationPrefillSchema>;

export const FillDeclarationSchema = z
  .object({
    eventSerieId: DeclarationSchema.shape.eventSerieId,
    clientId: DeclarationSchema.shape.clientId,
    placeName: DeclarationSchema.shape.placeName,
    placeCapacity: DeclarationSchema.shape.placeCapacity,
    placePostalCode: DeclarationSchema.shape.placePostalCode,
    managerName: DeclarationSchema.shape.managerName,
    managerTitle: DeclarationSchema.shape.managerTitle,
    performanceType: DeclarationSchema.shape.performanceType,
    declarationPlace: DeclarationSchema.shape.declarationPlace,
    revenues: DeclarationSchema.shape.revenues,
    expenses: DeclarationSchema.shape.expenses,
  })
  .strict();
export type FillDeclarationSchemaType = z.infer<typeof FillDeclarationSchema>;

export const FillDeclarationPrefillSchema = FillDeclarationSchema.deepPartial();
export type FillDeclarationPrefillSchemaType = z.infer<typeof FillDeclarationPrefillSchema>;
