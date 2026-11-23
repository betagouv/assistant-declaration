import { z } from 'zod';

import { AddressSchema } from '@ad/src/models/entities/address';
import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import {
  EventSchema,
  StricterEventSchema,
  StricterEventSerieSchema,
  assertAmountsRespectTaxLogic,
  assertValidExpenses,
} from '@ad/src/models/entities/event';
import { StricterOrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceSchema } from '@ad/src/models/entities/place';

// Avoid .pick() on refined schemas (zod 4.x limitation)
// Build new object schemas with only the fields we need

const SacdOrganizationSchema = z.object({
  id: StricterOrganizationSchema.shape.id,
  name: StricterOrganizationSchema.shape.name,
  officialId: StricterOrganizationSchema.shape.officialId,
  sacdId: StricterOrganizationSchema.shape.sacdId,
  headquartersAddress: AddressSchema,
}).strip();

const SacdEventSerieSchema = z.object({
  id: StricterEventSerieSchema.shape.id,
  name: StricterEventSerieSchema.shape.name,
  producerOfficialId: StricterEventSerieSchema.shape.producerOfficialId,
  producerName: StricterEventSerieSchema.shape.producerName,
  performanceType: StricterEventSerieSchema.shape.performanceType,
  expectedDeclarationTypes: StricterEventSerieSchema.shape.expectedDeclarationTypes,
  placeCapacity: StricterEventSerieSchema.shape.placeCapacity,
  audience: StricterEventSerieSchema.shape.audience,
  ticketingRevenueTaxRate: StricterEventSerieSchema.shape.ticketingRevenueTaxRate,
  expensesIncludingTaxes: StricterEventSerieSchema.shape.expensesIncludingTaxes,
  expensesExcludingTaxes: StricterEventSerieSchema.shape.expensesExcludingTaxes,
  introductionFeesExpensesIncludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesIncludingTaxes,
  introductionFeesExpensesExcludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesExcludingTaxes,
  circusSpecificExpensesIncludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesIncludingTaxes,
  circusSpecificExpensesExcludingTaxes: StricterEventSerieSchema.shape.circusSpecificExpensesExcludingTaxes,
  attachments: StricterEventSerieSchema.shape.attachments,
  place: PlaceSchema,
}).superRefine((data, ctx) => {
  assertValidExpenses(data, ctx);
  assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
  assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
  assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
}).strip();

const SacdEventSchema = z.object({
  id: StricterEventSchema.shape.id,
  startAt: StricterEventSchema.shape.startAt,
  endAt: StricterEventSchema.shape.endAt,
  ticketingRevenueIncludingTaxes: StricterEventSchema.shape.ticketingRevenueIncludingTaxes,
  ticketingRevenueExcludingTaxes: StricterEventSchema.shape.ticketingRevenueExcludingTaxes,
  freeTickets: StricterEventSchema.shape.freeTickets,
  paidTickets: StricterEventSchema.shape.paidTickets,
  placeCapacityOverride: StricterEventSchema.shape.placeCapacityOverride,
  audienceOverride: StricterEventSchema.shape.audienceOverride,
  ticketingRevenueTaxRateOverride: StricterEventSchema.shape.ticketingRevenueTaxRateOverride,
  placeOverride: PlaceSchema.nullable(),
}).superRefine((data, ctx) => {
  assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
}).strip();

export const SacdDeclarationSchema = DeclarationSchema.extend({
  organization: SacdOrganizationSchema,
  eventSerie: SacdEventSerieSchema,
  events: z.array(SacdEventSchema),
});
export type SacdDeclarationSchemaType = z.infer<typeof SacdDeclarationSchema>;

// This is useful to avoid in multiple locations of the code trying to search for the default value to display it
// It will ensure no isolate issue over time
export const FlattenSacdEventSchema = z.object({
  id: StricterEventSchema.shape.id,
  startAt: StricterEventSchema.shape.startAt,
  endAt: StricterEventSchema.shape.endAt,
  ticketingRevenueIncludingTaxes: StricterEventSchema.shape.ticketingRevenueIncludingTaxes,
  ticketingRevenueExcludingTaxes: StricterEventSchema.shape.ticketingRevenueExcludingTaxes,
  freeTickets: StricterEventSchema.shape.freeTickets,
  paidTickets: StricterEventSchema.shape.paidTickets,
  place: PlaceSchema,
  placeCapacity: StricterEventSerieSchema.shape.placeCapacity,
  audience: StricterEventSerieSchema.shape.audience,
});
export type FlattenSacdEventSchemaType = z.infer<typeof FlattenSacdEventSchema>;
