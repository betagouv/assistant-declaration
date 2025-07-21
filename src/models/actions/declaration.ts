import z from 'zod';

import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { SacdDeclarationOrganizationInputSchema, SacdDeclarationSchema } from '@ad/src/models/entities/declaration/sacd';
import { SacemDeclarationSchema } from '@ad/src/models/entities/declaration/sacem';
import { EventSerieSchema } from '@ad/src/models/entities/event';

export const TransmitDeclarationSchema = z
  .object({
    eventSerieId: SacemDeclarationSchema.shape.eventSerieId,
    type: DeclarationTypeSchema,
  })
  .strict();
export type TransmitDeclarationSchemaType = z.infer<typeof TransmitDeclarationSchema>;

export const GetSacemDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
  })
  .strict();
export type GetSacemDeclarationSchemaType = z.infer<typeof GetSacemDeclarationSchema>;

export const GetSacemDeclarationPrefillSchema = GetSacemDeclarationSchema.deepPartial();
export type GetSacemDeclarationPrefillSchemaType = z.infer<typeof GetSacemDeclarationPrefillSchema>;

export const FillSacemDeclarationSchema = z
  .object({
    eventSerieId: SacemDeclarationSchema.shape.eventSerieId,
    clientId: SacemDeclarationSchema.shape.clientId,
    placeName: SacemDeclarationSchema.shape.placeName,
    placeCapacity: SacemDeclarationSchema.shape.placeCapacity,
    placePostalCode: SacemDeclarationSchema.shape.placePostalCode,
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

export const GetSacdDeclarationSchema = z
  .object({
    eventSerieId: EventSerieSchema.shape.id,
  })
  .strict();
export type GetSacdDeclarationSchemaType = z.infer<typeof GetSacdDeclarationSchema>;

export const GetSacdDeclarationPrefillSchema = GetSacdDeclarationSchema.deepPartial();
export type GetSacdDeclarationPrefillSchemaType = z.infer<typeof GetSacdDeclarationPrefillSchema>;

export const FillSacdDeclarationSchema = z
  .object({
    eventSerieId: SacdDeclarationSchema.shape.eventSerieId,
    clientId: SacdDeclarationSchema.shape.clientId,
    placeName: SacdDeclarationSchema.shape.placeName,
    placeStreet: SacdDeclarationSchema.shape.placeStreet,
    placePostalCode: SacdDeclarationSchema.shape.placePostalCode,
    placeCity: SacdDeclarationSchema.shape.placeCity,
    accountingEntries: SacdDeclarationSchema.shape.accountingEntries,
    producer: SacdDeclarationOrganizationInputSchema,
  })
  .strict();
export type FillSacdDeclarationSchemaType = z.infer<typeof FillSacdDeclarationSchema>;

export const FillSacdDeclarationPrefillSchema = FillSacdDeclarationSchema.deepPartial();
export type FillSacdDeclarationPrefillSchemaType = z.infer<typeof FillSacdDeclarationPrefillSchema>;
