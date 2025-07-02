import {
  Address,
  Event,
  EventCategoryTickets,
  EventSerie,
  EventSerieDeclaration,
  EventSerieSacdDeclaration,
  EventSerieSacemDeclaration,
  Organization,
  Phone,
  SacdDeclarationAccountingEntry,
  SacdDeclarationOrganization,
  SacdDeclarationPerformedWork,
  SacemDeclarationAccountingEntry,
  TicketCategory,
  TicketingSystem,
  User,
} from '@prisma/client';

import { ensureMinimumSacdAccountingItems, ensureMinimumSacemExpenseItems, ensureMinimumSacemRevenueItems } from '@ad/src/core/declaration';
import { AddressSchemaType } from '@ad/src/models/entities/address';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import {
  SacdDeclarationAccountingEntrySchemaType,
  SacdDeclarationOrganizationSchemaType,
  SacdDeclarationSchemaType,
} from '@ad/src/models/entities/declaration/sacd';
import {
  AccountingCategorySchema,
  SacemDeclarationAccountingFluxEntrySchemaType,
  SacemDeclarationSchemaType,
} from '@ad/src/models/entities/declaration/sacem';
import { EventCategoryTicketsSchemaType, EventSchemaType, EventSerieSchemaType, TicketCategorySchemaType } from '@ad/src/models/entities/event';
import { OrganizationSchemaType } from '@ad/src/models/entities/organization';
import { PhoneSchemaType } from '@ad/src/models/entities/phone';
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

export function phonePrismaToModel(phone: Pick<Phone, 'id' | 'callingCode' | 'countryCode' | 'number'>): PhoneSchemaType {
  return {
    id: phone.id,
    callingCode: phone.callingCode,
    countryCode: phone.countryCode,
    number: phone.number,
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
    EventSerieSacdDeclaration: Partial<EventSerieSacdDeclaration> | null;
    EventSerieSacemDeclaration: Partial<EventSerieSacemDeclaration> | null;
  }
): DeclarationTypeSchemaType {
  if (declaration.EventSerieSacemDeclaration) {
    return DeclarationTypeSchema.Values.SACEM;
  } else if (declaration.EventSerieSacdDeclaration) {
    return DeclarationTypeSchema.Values.SACD;
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
    'id' | 'clientId' | 'placeName' | 'placeCapacity' | 'managerName' | 'managerTitle' | 'performanceType' | 'declarationPlace'
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
    performanceType: sacemDeclaration.performanceType,
    declarationPlace: sacemDeclaration.declarationPlace,
    revenues: ensureMinimumSacemRevenueItems(revenues),
    expenses: ensureMinimumSacemExpenseItems(expenses),
    ...computedPlaceholder,
  };
}

export function sacdPlaceholderDeclarationPrismaToModel(
  eventSerie: Pick<EventSerie, 'id' | 'name'> & {
    ticketingSystem: {
      organization: Pick<Organization, 'name'>;
    };
    Event: {
      EventCategoryTickets: (Pick<EventCategoryTickets, 'total' | 'totalOverride' | 'priceOverride'> & {
        category: Pick<TicketCategory, 'price'>;
      })[];
    }[];
  }
): Pick<SacdDeclarationSchemaType, 'organizationName' | 'eventSerieName' | 'averageTicketPrice' | 'accountingEntries'> {
  let totalAmount: number = 0;
  let totalTickets: number = 0;

  for (const event of eventSerie.Event) {
    for (const eventCategoryTicket of event.EventCategoryTickets) {
      const total = eventCategoryTicket.totalOverride ?? eventCategoryTicket.total;
      const price = (eventCategoryTicket.priceOverride ?? eventCategoryTicket.category.price).toNumber();

      totalTickets += total;
      totalAmount += total * price;
    }
  }

  // Round to 2 cents for clarity
  const averageTicketPrice = Math.round((totalAmount / totalTickets) * 100) / 100;

  return {
    organizationName: eventSerie.ticketingSystem.organization.name,
    eventSerieName: eventSerie.name,
    averageTicketPrice: averageTicketPrice,
    // With placeholder there is no reason to fill data except ticketing we have data for
    // Note: ensuring minimum items is done at another layer
    accountingEntries: [],
  };
}

export function sacdDeclarationPrismaToModel(
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
  sacdDeclaration: Pick<
    EventSerieSacdDeclaration,
    | 'id'
    | 'clientId'
    | 'officialHeadquartersId'
    | 'productionOperationId'
    | 'productionType'
    | 'placeName'
    | 'placePostalCode'
    | 'placeCity'
    | 'audience'
    | 'placeCapacity'
    | 'declarationPlace'
  > & {
    organizer: Pick<SacdDeclarationOrganization, 'name' | 'email' | 'phoneId' | 'officialHeadquartersId' | 'europeanVatId'> & {
      headquartersAddress: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
      phone: Pick<Phone, 'id' | 'callingCode' | 'countryCode' | 'number'>;
    };
    producer: Pick<SacdDeclarationOrganization, 'name' | 'email' | 'phoneId' | 'officialHeadquartersId' | 'europeanVatId'> & {
      headquartersAddress: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
      phone: Pick<Phone, 'id' | 'callingCode' | 'countryCode' | 'number'>;
    };
    rightsFeesManager: Pick<SacdDeclarationOrganization, 'name' | 'email' | 'phoneId' | 'officialHeadquartersId' | 'europeanVatId'> & {
      headquartersAddress: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
      phone: Pick<Phone, 'id' | 'callingCode' | 'countryCode' | 'number'>;
    };
    SacdDeclarationAccountingEntry: Pick<SacdDeclarationAccountingEntry, 'category' | 'categoryPrecision' | 'taxRate' | 'amount'>[];
    SacdDeclarationPerformedWork: Pick<SacdDeclarationPerformedWork, 'category' | 'name' | 'contributors' | 'durationSeconds'>[];
  } & Pick<EventSerieDeclaration, 'transmittedAt'>
): SacdDeclarationSchemaType {
  // Reuse data from the placeholder since this one is used until the form is submitted
  const { accountingEntries, ...computedPlaceholder } = sacdPlaceholderDeclarationPrismaToModel(eventSerie);

  for (const accountingEntry of sacdDeclaration.SacdDeclarationAccountingEntry) {
    const taxRate = accountingEntry.taxRate !== null ? accountingEntry.taxRate.toNumber() : null;
    const includingTaxesAmount = accountingEntry.amount.toNumber();

    accountingEntries.push({
      category: accountingEntry.category,
      categoryPrecision: accountingEntry.categoryPrecision,
      taxRate: taxRate,
      includingTaxesAmount: includingTaxesAmount,
    });
  }

  return {
    id: sacdDeclaration.id,
    eventSerieId: eventSerie.id,
    clientId: sacdDeclaration.clientId,
    officialHeadquartersId: sacdDeclaration.officialHeadquartersId,
    productionOperationId: sacdDeclaration.productionOperationId,
    productionType: sacdDeclaration.productionType,
    placeName: sacdDeclaration.placeName,
    placePostalCode: sacdDeclaration.placePostalCode,
    placeCity: sacdDeclaration.placeCity,
    audience: sacdDeclaration.audience,
    placeCapacity: sacdDeclaration.placeCapacity,
    declarationPlace: sacdDeclaration.declarationPlace,
    organizer: sacdDeclarationOrganizationPrismaToModel(sacdDeclaration.organizer),
    producer: sacdDeclarationOrganizationPrismaToModel(sacdDeclaration.producer),
    rightsFeesManager: sacdDeclarationOrganizationPrismaToModel(sacdDeclaration.rightsFeesManager),
    accountingEntries: ensureMinimumSacdAccountingItems(accountingEntries),
    performedWorks: sacdDeclaration.SacdDeclarationPerformedWork.map((performedWork) => {
      return {
        category: performedWork.category,
        name: performedWork.name,
        contributors: performedWork.contributors,
        durationSeconds: performedWork.durationSeconds,
      };
    }),
    ...computedPlaceholder,
    transmittedAt: sacdDeclaration.transmittedAt,
  };
}

export function sacdDeclarationOrganizationPrismaToModel(
  organization: Pick<SacdDeclarationOrganization, 'name' | 'email' | 'officialHeadquartersId' | 'europeanVatId'> & {
    headquartersAddress: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
    phone: Pick<Phone, 'id' | 'callingCode' | 'countryCode' | 'number'>;
  }
): SacdDeclarationOrganizationSchemaType {
  return {
    name: organization.name,
    email: organization.email,
    officialHeadquartersId: organization.officialHeadquartersId,
    europeanVatId: organization.europeanVatId,
    headquartersAddress: addressPrismaToModel(organization.headquartersAddress),
    phone: phonePrismaToModel(organization.phone),
  };
}
