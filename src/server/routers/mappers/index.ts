import {
  Address,
  Attachment,
  AttachmentsOnEventSeries,
  DeclarationType,
  Event,
  EventSerie,
  Organization,
  Place,
  TicketingSystem,
  User,
} from '@prisma/client';

import { AddressSchemaType } from '@ad/src/models/entities/address';
import { UiAttachmentSchemaType } from '@ad/src/models/entities/attachment';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { DeclarationSchemaType } from '@ad/src/models/entities/declaration/common';
import { EventSchemaType, EventSerieSchemaType } from '@ad/src/models/entities/event';
import { OrganizationSchemaType } from '@ad/src/models/entities/organization';
import { PlaceSchemaType } from '@ad/src/models/entities/place';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';
import { UserSchemaType } from '@ad/src/models/entities/user';
import { generateSignedAttachmentLink } from '@ad/src/server/routers/common/attachment';
import { fileAuthSecret } from '@ad/src/server/routers/common/attachment.server';

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
    headquartersAddressId: organization.headquartersAddressId,
    name: organization.name,
    sacemId: organization.sacemId,
    sacdId: organization.sacdId,
    sibilUsername: organization.sibilUsername,
    sibilPassword: organization.sibilPassword,
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

export function placePrismaToModel(
  place: Pick<Place, 'id' | 'name'> & {
    address: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
  }
): PlaceSchemaType {
  return {
    id: place.id,
    name: place.name,
    address: addressPrismaToModel(place.address),
  };
}

export function ticketingSystemPrismaToModel(
  ticketingSystem: Omit<
    TicketingSystem,
    'forceNextSynchronizationFrom' | 'lastProcessingError' | 'lastProcessingErrorAt' | 'apiAccessKey' | 'apiSecretKey'
  >
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

export function eventSeriePrismaToModel(
  eventSerie: Omit<EventSerie, 'lastManualUpdateAt'> & {
    AttachmentsOnEventSeries: Pick<AttachmentsOnEventSeries, 'attachmentId' | 'type'>[];
  }
): EventSerieSchemaType {
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
    ticketingRevenueTaxRate: eventSerie.ticketingRevenueTaxRate.toNumber(),
    expensesIncludingTaxes: eventSerie.expensesIncludingTaxes.toNumber(),
    expensesExcludingTaxes: eventSerie.expensesExcludingTaxes.toNumber(),
    expensesTaxRate: eventSerie.expensesTaxRate !== null ? eventSerie.expensesTaxRate.toNumber() : null,
    introductionFeesExpensesIncludingTaxes: eventSerie.introductionFeesExpensesIncludingTaxes.toNumber(),
    introductionFeesExpensesExcludingTaxes: eventSerie.introductionFeesExpensesExcludingTaxes.toNumber(),
    introductionFeesExpensesTaxRate:
      eventSerie.introductionFeesExpensesTaxRate !== null ? eventSerie.introductionFeesExpensesTaxRate.toNumber() : null,
    circusSpecificExpensesIncludingTaxes:
      eventSerie.circusSpecificExpensesIncludingTaxes !== null ? eventSerie.circusSpecificExpensesIncludingTaxes.toNumber() : null,
    circusSpecificExpensesExcludingTaxes:
      eventSerie.circusSpecificExpensesExcludingTaxes !== null ? eventSerie.circusSpecificExpensesExcludingTaxes.toNumber() : null,
    circusSpecificExpensesTaxRate: eventSerie.circusSpecificExpensesTaxRate !== null ? eventSerie.circusSpecificExpensesTaxRate.toNumber() : null,
    attachments: eventSerie.AttachmentsOnEventSeries.map((aOES) => attachmentOnEventSeriePrismaToModel(aOES)),
    createdAt: eventSerie.createdAt,
    updatedAt: eventSerie.updatedAt,
  };
}

export function eventPrismaToModel(event: Omit<Event, 'lastManualTicketingDataUpdateAt'>): EventSchemaType {
  return {
    id: event.id,
    internalTicketingSystemId: event.internalTicketingSystemId,
    eventSerieId: event.eventSerieId,
    startAt: event.startAt,
    endAt: event.endAt,
    ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes.toNumber(),
    ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes.toNumber(),
    consumptionsRevenueIncludingTaxes: event.consumptionsRevenueIncludingTaxes.toNumber(),
    consumptionsRevenueExcludingTaxes: event.consumptionsRevenueExcludingTaxes.toNumber(),
    consumptionsRevenueTaxRate: event.consumptionsRevenueTaxRate !== null ? event.consumptionsRevenueTaxRate.toNumber() : null,
    cateringRevenueIncludingTaxes: event.cateringRevenueIncludingTaxes.toNumber(),
    cateringRevenueExcludingTaxes: event.cateringRevenueExcludingTaxes.toNumber(),
    cateringRevenueTaxRate: event.cateringRevenueTaxRate !== null ? event.cateringRevenueTaxRate.toNumber() : null,
    programSalesRevenueIncludingTaxes: event.programSalesRevenueIncludingTaxes.toNumber(),
    programSalesRevenueExcludingTaxes: event.programSalesRevenueExcludingTaxes.toNumber(),
    programSalesRevenueTaxRate: event.programSalesRevenueTaxRate !== null ? event.programSalesRevenueTaxRate.toNumber() : null,
    otherRevenueIncludingTaxes: event.otherRevenueIncludingTaxes.toNumber(),
    otherRevenueExcludingTaxes: event.otherRevenueExcludingTaxes.toNumber(),
    otherRevenueTaxRate: event.otherRevenueTaxRate !== null ? event.otherRevenueTaxRate.toNumber() : null,
    freeTickets: event.freeTickets,
    paidTickets: event.paidTickets,
    placeOverrideId: event.placeOverrideId,
    placeCapacityOverride: event.placeCapacityOverride,
    audienceOverride: event.audienceOverride,
    ticketingRevenueTaxRateOverride: event.ticketingRevenueTaxRateOverride !== null ? event.ticketingRevenueTaxRateOverride.toNumber() : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export function declarationTypePrismaToModel(declarationType: DeclarationType): DeclarationTypeSchemaType {
  switch (declarationType) {
    case 'SACEM':
      return DeclarationTypeSchema.enum.SACEM;
    case 'SACD':
      return DeclarationTypeSchema.enum.SACD;
    default:
      throw new Error(`declaration type not handled`);
  }
}

export function declarationPrismaToModel(
  eventSerie: Omit<EventSerie, 'lastManualUpdateAt'> & {
    ticketingSystem: {
      organization: Organization & {
        headquartersAddress: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
      };
    };
    place:
      | (Pick<Place, 'id' | 'name'> & {
          address: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
        })
      | null;
    Event: (Omit<Event, 'lastManualTicketingDataUpdateAt'> & {
      placeOverride:
        | (Pick<Place, 'id' | 'name'> & {
            address: Pick<Address, 'id' | 'street' | 'city' | 'postalCode' | 'countryCode' | 'subdivision'>;
          })
        | null;
    })[];
    AttachmentsOnEventSeries: Pick<AttachmentsOnEventSeries, 'attachmentId' | 'type'>[];
  }
): DeclarationSchemaType {
  const {
    headquartersAddressId,
    createdAt: createdAtO,
    updatedAt: updatedAtO,
    ...liteOrganization
  } = organizationPrismaToModel(eventSerie.ticketingSystem.organization);
  const {
    placeId,
    internalTicketingSystemId,
    ticketingSystemId,
    createdAt: createdAtES,
    updatedAt: updatedAtES,
    ...liteEventSerie
  } = eventSeriePrismaToModel(eventSerie);

  return {
    organization: {
      ...liteOrganization,
      headquartersAddress: addressPrismaToModel(eventSerie.ticketingSystem.organization.headquartersAddress),
    },
    eventSerie: {
      ...liteEventSerie,
      place: eventSerie.place ? placePrismaToModel(eventSerie.place) : null,
    },
    events: eventSerie.Event.map((event) => {
      const { placeOverrideId, internalTicketingSystemId, eventSerieId, createdAt, updatedAt, ...liteEvent } = eventPrismaToModel(event);

      return {
        ...liteEvent,
        placeOverride: event.placeOverride ? placePrismaToModel(event.placeOverride) : null,
      };
    }),
  };
}

export async function attachmentPrismaToModel(
  attachment: Pick<Attachment, 'id'> & Partial<Pick<Attachment, 'contentType' | 'size' | 'name'>>
): Promise<UiAttachmentSchemaType> {
  return {
    id: attachment.id,
    url: await generateSignedAttachmentLink(attachment.id, fileAuthSecret),
    contentType: attachment.contentType,
    size: attachment.size,
    name: attachment.name,
  };
}

export async function attachmentIdPrismaToModel(attachmentId: null): Promise<null>;
export async function attachmentIdPrismaToModel(attachmentId: string): Promise<UiAttachmentSchemaType>;
export async function attachmentIdPrismaToModel(attachmentId: string | null): Promise<UiAttachmentSchemaType | null> {
  if (!attachmentId) {
    return null;
  }

  return await attachmentPrismaToModel({
    id: attachmentId,
  });
}

export function attachmentOnEventSeriePrismaToModel(
  attachmentOnEventSerie: Pick<AttachmentsOnEventSeries, 'attachmentId' | 'type'>
): EventSerieSchemaType['attachments'][0] {
  return {
    id: attachmentOnEventSerie.attachmentId,
    type: attachmentOnEventSerie.type,
  };
}
