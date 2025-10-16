import { getTaxAmountFromIncludingAndExcludingTaxesAmounts } from '@ad/src/core/declaration';
import { FlattenSacdEventSchemaType, SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { FlattenSacemEventSchemaType, SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
import { EventSchemaType } from '@ad/src/models/entities/event';

export function getFlattenEventsForSacemDeclaration(declaration: SacemDeclarationSchemaType): FlattenSacemEventSchemaType[] {
  const flattenEvents: FlattenSacemEventSchemaType[] = [];

  for (const originalEvent of declaration.events) {
    originalEvent.audienceOverride;

    flattenEvents.push({
      startAt: originalEvent.startAt,
      ticketingRevenueIncludingTaxes: originalEvent.ticketingRevenueIncludingTaxes,
      ticketingRevenueExcludingTaxes: originalEvent.ticketingRevenueExcludingTaxes,
      consumptionsRevenueIncludingTaxes: originalEvent.consumptionsRevenueIncludingTaxes,
      consumptionsRevenueExcludingTaxes: originalEvent.consumptionsRevenueExcludingTaxes,
      consumptionsRevenueTaxRate: originalEvent.consumptionsRevenueTaxRate,
      cateringRevenueIncludingTaxes: originalEvent.cateringRevenueIncludingTaxes,
      cateringRevenueExcludingTaxes: originalEvent.cateringRevenueExcludingTaxes,
      cateringRevenueTaxRate: originalEvent.cateringRevenueTaxRate,
      programSalesRevenueIncludingTaxes: originalEvent.programSalesRevenueIncludingTaxes,
      programSalesRevenueExcludingTaxes: originalEvent.programSalesRevenueExcludingTaxes,
      programSalesRevenueTaxRate: originalEvent.programSalesRevenueTaxRate,
      otherRevenueIncludingTaxes: originalEvent.otherRevenueIncludingTaxes,
      otherRevenueExcludingTaxes: originalEvent.otherRevenueExcludingTaxes,
      otherRevenueTaxRate: originalEvent.otherRevenueTaxRate,
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
      id: originalEvent.id,
      startAt: originalEvent.startAt,
      endAt: originalEvent.endAt,
      ticketingRevenueIncludingTaxes: originalEvent.ticketingRevenueIncludingTaxes,
      ticketingRevenueExcludingTaxes: originalEvent.ticketingRevenueExcludingTaxes,
      freeTickets: originalEvent.freeTickets,
      paidTickets: originalEvent.paidTickets,
      place: originalEvent.placeOverride ?? declaration.eventSerie.place,
      placeCapacity: originalEvent.placeCapacityOverride ?? declaration.eventSerie.placeCapacity,
      audience: originalEvent.audienceOverride ?? declaration.eventSerie.audience,
    });
  }

  return flattenEvents;
}

export function getEventsKeyFigures(
  events: Pick<
    EventSchemaType | FlattenSacemEventSchemaType | FlattenSacdEventSchemaType,
    'ticketingRevenueIncludingTaxes' | 'ticketingRevenueExcludingTaxes' | 'freeTickets' | 'paidTickets'
  >[]
) {
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

export function getSacemEventsKeyFigures(events: FlattenSacemEventSchemaType[]) {
  const keyFigures = {
    nonTicketingRevenueIncludingTaxes: 0,
    nonTicketingRevenueExcludingTaxes: 0,
    nonTicketingRevenueTaxes: 0,
  };

  for (const event of events) {
    keyFigures.nonTicketingRevenueIncludingTaxes +=
      event.consumptionsRevenueIncludingTaxes +
      event.cateringRevenueIncludingTaxes +
      event.programSalesRevenueIncludingTaxes +
      event.otherRevenueIncludingTaxes;
    keyFigures.nonTicketingRevenueExcludingTaxes +=
      event.consumptionsRevenueExcludingTaxes +
      event.cateringRevenueExcludingTaxes +
      event.programSalesRevenueExcludingTaxes +
      event.otherRevenueExcludingTaxes;
  }

  keyFigures.nonTicketingRevenueTaxes = getTaxAmountFromIncludingAndExcludingTaxesAmounts(
    keyFigures.nonTicketingRevenueIncludingTaxes,
    keyFigures.nonTicketingRevenueExcludingTaxes
  );

  return keyFigures;
}
