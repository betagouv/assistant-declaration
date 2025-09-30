import { Address, DeclarationType, Event, EventSerie, Organization, TicketingSystem, User } from '@prisma/client';

import { AddressSchemaType } from '@ad/src/models/entities/address';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { DeclarationSchemaType } from '@ad/src/models/entities/declaration/common';
import { EventSchemaType, EventSerieSchemaType } from '@ad/src/models/entities/event';
import { OrganizationSchemaType } from '@ad/src/models/entities/organization';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';
import { UserSchemaType } from '@ad/src/models/entities/user';

export function userPrismaToModel(user: User): UserSchemaType {
  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    status: user.status,
    lastActivityAt: user.lastActivityAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function organizationPrismaToModel(organization: Organization): OrganizationSchemaType {
  return {
    id: organization.id,
    officialId: organization.officialId,
    officialHeadquartersId: organization.officialHeadquartersId,
    name: organization.name,
    sacemId: organization.sacemId,
    sacdId: organization.sacdId,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export function addressPrismaToModel(
  address: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>
): AddressSchemaType {
  return {
    id: address.id,
    street: address.street,
    city: address.city,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    subdivision: address.subdivision,
  };
}

export function ticketingSystemPrismaToModel(
  ticketingSystem: Omit<TicketingSystem, 'lastProcessingError' | 'lastProcessingErrorAt' | 'apiAccessKey' | 'apiSecretKey'>
): TicketingSystemSchemaType {
  return {
    id: ticketingSystem.id,
    organizationId: ticketingSystem.organizationId,
    name: ticketingSystem.name,
    lastSynchronizationAt: ticketingSystem.lastSynchronizationAt,
    createdAt: ticketingSystem.createdAt,
    updatedAt: ticketingSystem.updatedAt,
    deletedAt: ticketingSystem.deletedAt,
  };
}

export function eventSeriePrismaToModel(eventSerie: EventSerie): EventSerieSchemaType {
  return {
    id: eventSerie.id,
    internalTicketingSystemId: eventSerie.internalTicketingSystemId,
    ticketingSystemId: eventSerie.ticketingSystemId,
    name: eventSerie.name,
    producerOfficialId: eventSerie.producerOfficialId,
    producerName: eventSerie.producerName,
    performanceType: eventSerie.performanceType ? eventSerie.performanceType : null,
    expectedDeclarationTypes: eventSerie.expectedDeclarationTypes,
    placeId: eventSerie.placeId,
    placeCapacity: eventSerie.placeCapacity,
    audience: eventSerie.audience,
    taxRate: eventSerie.taxRate.toNumber(),
    expensesAmount: eventSerie.expensesAmount.toNumber(),
    createdAt: eventSerie.createdAt,
    updatedAt: eventSerie.updatedAt,
  };
}

export function eventPrismaToModel(event: Event): EventSchemaType {
  return {
    id: event.id,
    internalTicketingSystemId: event.internalTicketingSystemId,
    eventSerieId: event.eventSerieId,
    startAt: event.startAt,
    endAt: event.endAt,
    ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes.toNumber(),
    ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes.toNumber(),
    ticketingRevenueTaxRate: event.ticketingRevenueTaxRate !== null ? event.ticketingRevenueTaxRate.toNumber() : null,
    freeTickets: event.freeTickets,
    paidTickets: event.paidTickets,
    placeOverrideId: event.placeOverrideId,
    placeCapacityOverride: event.placeCapacityOverride,
    audienceOverride: event.audienceOverride,
    taxRateOverride: event.taxRateOverride !== null ? event.taxRateOverride.toNumber() : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export function declarationTypePrismaToModel(declarationType: DeclarationType): DeclarationTypeSchemaType {
  switch (declarationType) {
    case 'SACEM':
      return DeclarationTypeSchema.Values.SACEM;
    case 'SACD':
      return DeclarationTypeSchema.Values.SACD;
    default:
      throw new Error(`declaration type not handled`);
  }
}

export function declarationPrismaToModel(
  eventSerie: EventSerie & {
    ticketingSystem: {
      organization: Organization;
    };
    Event: Event[];
  }
): DeclarationSchemaType {
  const { placeId, ...liteEventSerie } = eventSeriePrismaToModel(eventSerie);

  return {
    organization: organizationPrismaToModel(eventSerie.ticketingSystem.organization),
    eventSerie: {
      ...liteEventSerie,
      place: null, // TODO: should patch place
    },
    events: eventSerie.Event.map((event) => {
      const { placeOverrideId, ...liteEvent } = eventPrismaToModel(event);

      return {
        ...liteEvent,
        placeOverride: null, // TODO: should patch place
      };
    }),
  };
}
