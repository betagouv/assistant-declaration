import {
  Event,
  EventCategoryTickets,
  EventSerie,
  EventSerieDeclaration,
  EventSerieSacemDeclaration,
  Organization,
  SacemDeclarationAccountingEntry,
  TicketCategory,
  TicketingSystem,
  User,
} from '@prisma/client';

import { ensureMinimumSacemExpenseItems, ensureMinimumSacemRevenueItems } from '@ad/src/core/declaration';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import {
  AccountingCategorySchema,
  SacemDeclarationAccountingFluxEntrySchemaType,
  SacemDeclarationSchemaType,
} from '@ad/src/models/entities/declaration';
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

export function sacemPlaceholderDeclarationPrismaToModel(
  eventSerie: Pick<EventSerie, 'id' | 'name' | 'startAt' | 'endAt' | 'taxRate'> & {
    ticketingSystem: {
      organization: Pick<Organization, 'name'>;
    };
    Event: {
      EventCategoryTickets: (Pick<EventCategoryTickets, 'total' | 'totalOverride' | 'priceOverride'> & {
        category: Pick<TicketCategory, 'price'>;
      })[];
    }[];
  }
): Pick<
  SacemDeclarationSchemaType,
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

  for (const event of eventSerie.Event) {
    for (const eventCategoryTicket of event.EventCategoryTickets) {
      const total = eventCategoryTicket.totalOverride ?? eventCategoryTicket.total;
      const price = (eventCategoryTicket.priceOverride ?? eventCategoryTicket.category.price).toNumber();

      if (price === 0) {
        freeTickets += total;
      } else {
        paidTickets += total;
        includingTaxesAmount += total * price;
      }
    }
  }

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

export function sacemDeclarationPrismaToModel(
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
  sacemDeclaration: Pick<
    EventSerieSacemDeclaration,
    'id' | 'clientId' | 'placeName' | 'placeCapacity' | 'managerName' | 'managerTitle' | 'declarationPlace'
  > & {
    SacemDeclarationAccountingEntry: Pick<SacemDeclarationAccountingEntry, 'flux' | 'category' | 'categoryPrecision' | 'taxRate' | 'amount'>[];
  }
): SacemDeclarationSchemaType {
  // Reuse data from the placeholder since this one is used until the form is submitted
  const { revenues, expenses, ...computedPlaceholder } = sacemPlaceholderDeclarationPrismaToModel(eventSerie);

  for (const accountingEntry of sacemDeclaration.SacemDeclarationAccountingEntry) {
    const taxRate = accountingEntry.taxRate.toNumber();
    const includingTaxesAmount = accountingEntry.amount.toNumber();

    const categoryFluxEntry: SacemDeclarationAccountingFluxEntrySchemaType = {
      category: accountingEntry.category,
      categoryPrecision: accountingEntry.categoryPrecision,
      taxRate: taxRate,
      includingTaxesAmount: includingTaxesAmount,
    };

    if (accountingEntry.flux === 'REVENUE') {
      revenues.push(categoryFluxEntry);
    } else if (accountingEntry.flux === 'EXPENSE') {
      expenses.push(categoryFluxEntry);
    }
  }

  return {
    id: sacemDeclaration.id,
    eventSerieId: eventSerie.id,
    clientId: sacemDeclaration.clientId,
    placeName: sacemDeclaration.placeName,
    placeCapacity: sacemDeclaration.placeCapacity,
    managerName: sacemDeclaration.managerName,
    managerTitle: sacemDeclaration.managerTitle,
    declarationPlace: sacemDeclaration.declarationPlace,
    revenues: ensureMinimumSacemRevenueItems(revenues),
    expenses: ensureMinimumSacemExpenseItems(expenses),
    ...computedPlaceholder,
  };
}
