import {
  Event,
  EventCategoryTickets,
  EventSerie,
  EventSerieDeclaration,
  EventSerieSacemDeclaration,
  Organization,
  TicketCategory,
  TicketingSystem,
  User,
} from '@prisma/client';

import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/declaration';
import { EventCategoryTicketsSchemaType, EventSchemaType, EventSerieSchemaType, TicketCategorySchemaType } from '@ad/src/models/entities/event';
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
    name: organization.name,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
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

export function ticketCategoryPrismaToModel(ticketCategory: TicketCategory): TicketCategorySchemaType {
  return {
    id: ticketCategory.id,
    internalTicketingSystemId: ticketCategory.internalTicketingSystemId,
    eventSerieId: ticketCategory.eventSerieId,
    name: ticketCategory.name,
    description: ticketCategory.description,
    price: ticketCategory.price.toNumber(),
    createdAt: ticketCategory.createdAt,
    updatedAt: ticketCategory.updatedAt,
  };
}

export function eventCategoryTicketsPrismaToModel(eventCategoryTickets: EventCategoryTickets): EventCategoryTicketsSchemaType {
  return {
    id: eventCategoryTickets.id,
    eventId: eventCategoryTickets.eventId,
    categoryId: eventCategoryTickets.categoryId,
    total: eventCategoryTickets.total,
    totalOverride: eventCategoryTickets.totalOverride,
    priceOverride: eventCategoryTickets.priceOverride !== null ? eventCategoryTickets.priceOverride.toNumber() : null,
    createdAt: eventCategoryTickets.createdAt,
    updatedAt: eventCategoryTickets.updatedAt,
  };
}

export function declarationTypePrismaToModel(
  declaration: Partial<EventSerieDeclaration> & {
    EventSerieSacemDeclaration: Partial<EventSerieSacemDeclaration> | null;
  }
): DeclarationTypeSchemaType {
  if (declaration.EventSerieSacemDeclaration) {
    return DeclarationTypeSchema.Values.SACEM;
  }

  throw new Error(`declaration type not handled`);
}
