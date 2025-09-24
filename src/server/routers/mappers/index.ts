import { Address, DeclarationType, Event, EventSerie, EventSerieDeclaration, Organization, TicketingSystem, User } from '@prisma/client';

import { AddressSchemaType } from '@ad/src/models/entities/address';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { AccountingCategorySchema, DeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
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
    startAt: eventSerie.startAt,
    endAt: eventSerie.endAt,
    taxRate: eventSerie.taxRate.toNumber(),
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

export function placeholderDeclarationPrismaToModel(
  eventSerie: Pick<EventSerie, 'id' | 'name' | 'startAt' | 'endAt' | 'taxRate'> & {
    ticketingSystem: {
      organization: Pick<Organization, 'name'>;
    };
  }
): Pick<
  DeclarationSchemaType,
  | 'organizationName'
  | 'eventSerieName'
  | 'eventSerieStartAt'
  | 'eventSerieEndAt'
  | 'eventsCount'
  | 'paidTickets'
  | 'freeTickets'
  | 'revenues'
  | 'expenses'
> {
  let freeTickets: number = 0;
  let paidTickets: number = 0;
  let includingTaxesAmount: number = 0;

  // TODO:
  // TODO:
  // TODO:
  // TODO:

  return {
    organizationName: eventSerie.ticketingSystem.organization.name,
    eventSerieName: eventSerie.name,
    eventSerieStartAt: eventSerie.startAt,
    eventSerieEndAt: eventSerie.endAt,
    eventsCount: eventSerie.Event.length,
    paidTickets: paidTickets,
    freeTickets: freeTickets,
    // With placeholder there is no reason to fill data except ticketing we have data for
    // Note: ensuring minimum items is done at another layer
    revenues: [
      {
        category: AccountingCategorySchema.Values.TICKETING,
        categoryPrecision: null,
        taxRate: eventSerie.taxRate.toNumber(),
        includingTaxesAmount: includingTaxesAmount,
      },
    ],
    expenses: [],
  };
}

export function declarationPrismaToModel(
  eventSerie: Pick<EventSerie, 'id' | 'name' | 'startAt' | 'endAt' | 'taxRate'> & {
    ticketingSystem: {
      organization: Pick<Organization, 'name'>;
    };
    Event: {
      EventCategoryTickets: (Pick<EventCategoryTickets, 'total' | 'totalOverride' | 'priceOverride'> & {
        category: Pick<TicketCategory, 'price'>;
      })[];
    }[];
  },
  declaration: Pick<
    EventSerieDeclaration,
    'id' | 'clientId' | 'placeName' | 'placeCapacity' | 'placePostalCode' | 'managerName' | 'managerTitle' | 'performanceType' | 'declarationPlace'
  > &
    Pick<EventSerieDeclaration, 'transmittedAt'>
): DeclarationSchemaType {
  // Reuse data from the placeholder since this one is used until the form is submitted
  const computedPlaceholder = placeholderDeclarationPrismaToModel(eventSerie);

  return {
    id: declaration.id,
    eventSerieId: eventSerie.id,
    clientId: declaration.clientId,
    placeName: declaration.placeName,
    placeCapacity: declaration.placeCapacity,
    placePostalCode: declaration.placePostalCode,
    managerName: declaration.managerName,
    managerTitle: declaration.managerTitle,
    performanceType: declaration.performanceType,
    declarationPlace: declaration.declarationPlace,
    ...computedPlaceholder,
    transmittedAt: declaration.transmittedAt,
  };
}
