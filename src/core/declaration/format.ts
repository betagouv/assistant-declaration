import { getTaxAmountFromIncludingAndExcludingTaxesAmounts } from '@ad/src/core/declaration';
import { FlattenSacdEventSchemaType, SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { FlattenSacemEventSchemaType, SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';

export function getFlattenEventsForSacemDeclaration(declaration: SacemDeclarationSchemaType): FlattenSacemEventSchemaType[] {
  const flattenEvents: FlattenSacemEventSchemaType[] = [];

  for (const originalEvent of declaration.events) {
    flattenEvents.push({
      startAt: originalEvent.startAt,
      ticketingRevenueIncludingTaxes: originalEvent.ticketingRevenueIncludingTaxes,
      ticketingRevenueExcludingTaxes: originalEvent.ticketingRevenueExcludingTaxes,
      ticketingRevenueTaxRate: originalEvent.taxRateOverride ? originalEvent.ticketingRevenueTaxRate : declaration.eventSerie.taxRate,
      freeTickets: originalEvent.freeTickets,
      paidTickets: originalEvent.paidTickets,
      place: originalEvent.placeOverride ?? declaration.eventSerie.place,
      placeCapacity: originalEvent.placeCapacityOverride ?? declaration.eventSerie.placeCapacity,
      audience: originalEvent.audienceOverride ?? declaration.eventSerie.audience,
    });
  }

  return flattenEvents;
}

export function getFlattenEventsForSacdDeclaration(declaration: SacdDeclarationSchemaType): FlattenSacdEventSchemaType[] {
  const flattenEvents: FlattenSacdEventSchemaType[] = [];

  for (const originalEvent of declaration.events) {
    flattenEvents.push({
      startAt: originalEvent.startAt,
      ticketingRevenueIncludingTaxes: originalEvent.ticketingRevenueIncludingTaxes,
      ticketingRevenueExcludingTaxes: originalEvent.ticketingRevenueExcludingTaxes,
      ticketingRevenueTaxRate: originalEvent.taxRateOverride ? originalEvent.ticketingRevenueTaxRate : declaration.eventSerie.taxRate,
      freeTickets: originalEvent.freeTickets,
      paidTickets: originalEvent.paidTickets,
      place: originalEvent.placeOverride ?? declaration.eventSerie.place,
      placeCapacity: originalEvent.placeCapacityOverride ?? declaration.eventSerie.placeCapacity,
      audience: originalEvent.audienceOverride ?? declaration.eventSerie.audience,
    });
  }

  return flattenEvents;
}

export function getFlattenEventsKeyFigures(events: (FlattenSacemEventSchemaType | FlattenSacdEventSchemaType)[]) {
  const keyFigures = {
    ticketingRevenueIncludingTaxes: 0,
    ticketingRevenueExcludingTaxes: 0,
    ticketingRevenueTaxes: 0,
    freeTickets: 0,
    paidTickets: 0,
  };

  for (const event of events) {
    keyFigures.ticketingRevenueIncludingTaxes += event.ticketingRevenueIncludingTaxes;
    keyFigures.ticketingRevenueExcludingTaxes += event.ticketingRevenueExcludingTaxes;
    keyFigures.freeTickets += event.freeTickets;
    keyFigures.paidTickets += event.paidTickets;
  }

  keyFigures.ticketingRevenueTaxes = getTaxAmountFromIncludingAndExcludingTaxesAmounts(
    keyFigures.ticketingRevenueIncludingTaxes,
    keyFigures.ticketingRevenueExcludingTaxes
  );

  return keyFigures;
}
