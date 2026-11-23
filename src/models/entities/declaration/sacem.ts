import { z } from 'zod';

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

// Here we take the original stored structure but forcing fields as required when needed by SACEM
// Build schema without .pick() to avoid zod 4.x refinements limitation
const SacemOrganizationSchema = z.object({
  id: StricterOrganizationSchema.shape.id,
  name: StricterOrganizationSchema.shape.name,
  officialId: StricterOrganizationSchema.shape.officialId,
  officialHeadquartersId: StricterOrganizationSchema.shape.officialHeadquartersId,
  sacemId: StricterOrganizationSchema.shape.sacemId,
}).strip();

const SacemEventSerieSchema = z.object({
  name: StricterEventSerieSchema.shape.name,
  performanceType: StricterEventSerieSchema.shape.performanceType,
  expectedDeclarationTypes: StricterEventSerieSchema.shape.expectedDeclarationTypes,
  placeCapacity: StricterEventSerieSchema.shape.placeCapacity,
  audience: StricterEventSerieSchema.shape.audience,
  ticketingRevenueTaxRate: StricterEventSerieSchema.shape.ticketingRevenueTaxRate,
  expensesIncludingTaxes: StricterEventSerieSchema.shape.expensesIncludingTaxes,
  expensesExcludingTaxes: StricterEventSerieSchema.shape.expensesExcludingTaxes,
  introductionFeesExpensesIncludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesIncludingTaxes,
  introductionFeesExpensesExcludingTaxes: StricterEventSerieSchema.shape.introductionFeesExpensesExcludingTaxes,
  attachments: StricterEventSerieSchema.shape.attachments,
  place: PlaceSchema,
}).superRefine((data, ctx) => {
  assertValidExpenses(data, ctx);
  assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
  assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
}).strip();

const SacemEventSchema = z.object({
  startAt: StricterEventSchema.shape.startAt,
  ticketingRevenueIncludingTaxes: StricterEventSchema.shape.ticketingRevenueIncludingTaxes,
  ticketingRevenueExcludingTaxes: StricterEventSchema.shape.ticketingRevenueExcludingTaxes,
  consumptionsRevenueIncludingTaxes: StricterEventSchema.shape.consumptionsRevenueIncludingTaxes,
  consumptionsRevenueExcludingTaxes: StricterEventSchema.shape.consumptionsRevenueExcludingTaxes,
  cateringRevenueIncludingTaxes: StricterEventSchema.shape.cateringRevenueIncludingTaxes,
  cateringRevenueExcludingTaxes: StricterEventSchema.shape.cateringRevenueExcludingTaxes,
  programSalesRevenueIncludingTaxes: StricterEventSchema.shape.programSalesRevenueIncludingTaxes,
  programSalesRevenueExcludingTaxes: StricterEventSchema.shape.programSalesRevenueExcludingTaxes,
  otherRevenueIncludingTaxes: StricterEventSchema.shape.otherRevenueIncludingTaxes,
  otherRevenueExcludingTaxes: StricterEventSchema.shape.otherRevenueExcludingTaxes,
  freeTickets: StricterEventSchema.shape.freeTickets,
  paidTickets: StricterEventSchema.shape.paidTickets,
  // Optional overrides from EventSchema
  consumptionsRevenueTaxRate: EventSchema.shape.consumptionsRevenueTaxRate.optional(),
  cateringRevenueTaxRate: EventSchema.shape.cateringRevenueTaxRate.optional(),
  programSalesRevenueTaxRate: EventSchema.shape.programSalesRevenueTaxRate.optional(),
  otherRevenueTaxRate: EventSchema.shape.otherRevenueTaxRate.optional(),
  placeCapacityOverride: EventSchema.shape.placeCapacityOverride.optional(),
  audienceOverride: EventSchema.shape.audienceOverride.optional(),
  ticketingRevenueTaxRateOverride: EventSchema.shape.ticketingRevenueTaxRateOverride.optional(),
  placeOverride: PlaceSchema.nullable(),
}).superRefine((data, ctx) => {
  assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
  assertAmountsRespectTaxLogic(data, 'consumptionsRevenueExcludingTaxes', 'consumptionsRevenueIncludingTaxes', ctx);
  assertAmountsRespectTaxLogic(data, 'cateringRevenueExcludingTaxes', 'cateringRevenueIncludingTaxes', ctx);
  assertAmountsRespectTaxLogic(data, 'programSalesRevenueExcludingTaxes', 'programSalesRevenueIncludingTaxes', ctx);
  assertAmountsRespectTaxLogic(data, 'otherRevenueExcludingTaxes', 'otherRevenueIncludingTaxes', ctx);
}).strip();

export const SacemDeclarationSchema = DeclarationSchema.extend({
  organization: SacemOrganizationSchema,
  eventSerie: SacemEventSerieSchema,
  events: z.array(SacemEventSchema),
});
export type SacemDeclarationSchemaType = z.infer<typeof SacemDeclarationSchema>;

// This is useful to avoid in multiple locations of the code trying to search for the default value to display it
// It will ensure no isolate issue over time
export const FlattenSacemEventSchema = z.object({
  startAt: StricterEventSchema.shape.startAt,
  ticketingRevenueIncludingTaxes: StricterEventSchema.shape.ticketingRevenueIncludingTaxes,
  ticketingRevenueExcludingTaxes: StricterEventSchema.shape.ticketingRevenueExcludingTaxes,
  consumptionsRevenueIncludingTaxes: StricterEventSchema.shape.consumptionsRevenueIncludingTaxes,
  consumptionsRevenueExcludingTaxes: StricterEventSchema.shape.consumptionsRevenueExcludingTaxes,
  cateringRevenueIncludingTaxes: StricterEventSchema.shape.cateringRevenueIncludingTaxes,
  cateringRevenueExcludingTaxes: StricterEventSchema.shape.cateringRevenueExcludingTaxes,
  programSalesRevenueIncludingTaxes: StricterEventSchema.shape.programSalesRevenueIncludingTaxes,
  programSalesRevenueExcludingTaxes: StricterEventSchema.shape.programSalesRevenueExcludingTaxes,
  otherRevenueIncludingTaxes: StricterEventSchema.shape.otherRevenueIncludingTaxes,
  otherRevenueExcludingTaxes: StricterEventSchema.shape.otherRevenueExcludingTaxes,
  freeTickets: StricterEventSchema.shape.freeTickets,
  paidTickets: StricterEventSchema.shape.paidTickets,
  place: PlaceSchema,
  // Tax rates from EventSchema (optional as in EventSchema)
  consumptionsRevenueTaxRate: EventSchema.shape.consumptionsRevenueTaxRate.optional(),
  cateringRevenueTaxRate: EventSchema.shape.cateringRevenueTaxRate.optional(),
  programSalesRevenueTaxRate: EventSchema.shape.programSalesRevenueTaxRate.optional(),
  otherRevenueTaxRate: EventSchema.shape.otherRevenueTaxRate.optional(),
  // From EventSerieSchema
  placeCapacity: StricterEventSerieSchema.shape.placeCapacity,
  audience: StricterEventSerieSchema.shape.audience,
});
export type FlattenSacemEventSchemaType = z.infer<typeof FlattenSacemEventSchema>;
