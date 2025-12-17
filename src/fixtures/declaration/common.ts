import { addresses } from '@ad/src/fixtures/address';
import { uiAttachments } from '@ad/src/fixtures/attachment';
import { events, eventsSeries } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';
import { places } from '@ad/src/fixtures/place';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';
import { DeclarationAttachmentTypeSchema, DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import {
  DeclarationSchema,
  DeclarationSchemaType,
  DeclarationWrapperSchema,
  DeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration/common';

const partialEvents = events.map((event) => {
  const { internalTicketingSystemId, eventSerieId, placeOverrideId, createdAt, updatedAt, ...partialEvent } = event;

  return partialEvent;
});

export const eventsWithPlace: DeclarationSchemaType['events'] = [
  { ...partialEvents[0], placeOverride: places[1] },
  { ...partialEvents[1], placeOverride: null },
  { ...partialEvents[2], placeOverride: places[2] },
];

export const declarations: DeclarationSchemaType[] = [
  DeclarationSchema.parse({
    organization: {
      id: organizations[0].id,
      name: organizations[0].name,
      officialId: organizations[0].officialId,
      officialHeadquartersId: organizations[0].officialHeadquartersId,
      headquartersAddress: addresses[0],
      sacemId: organizations[0].sacemId,
      sacdId: organizations[0].sacdId,
    },
    eventSerie: {
      id: eventsSeries[0].id,
      name: eventsSeries[0].name,
      producerOfficialId: eventsSeries[0].producerOfficialId,
      producerName: eventsSeries[0].producerName,
      performanceType: eventsSeries[0].performanceType,
      expectedDeclarationTypes: eventsSeries[0].expectedDeclarationTypes,
      place: places[0],
      placeCapacity: eventsSeries[0].placeCapacity,
      audience: eventsSeries[0].audience,
      ticketingRevenueTaxRate: eventsSeries[0].ticketingRevenueTaxRate,
      expensesIncludingTaxes: eventsSeries[0].expensesIncludingTaxes,
      expensesExcludingTaxes: eventsSeries[0].expensesExcludingTaxes,
      expensesTaxRate: eventsSeries[0].expensesTaxRate,
      introductionFeesExpensesIncludingTaxes: eventsSeries[0].introductionFeesExpensesIncludingTaxes,
      introductionFeesExpensesExcludingTaxes: eventsSeries[0].introductionFeesExpensesExcludingTaxes,
      introductionFeesExpensesTaxRate: eventsSeries[0].introductionFeesExpensesTaxRate,
      circusSpecificExpensesIncludingTaxes: eventsSeries[0].circusSpecificExpensesIncludingTaxes,
      circusSpecificExpensesExcludingTaxes: eventsSeries[0].circusSpecificExpensesExcludingTaxes,
      circusSpecificExpensesTaxRate: eventsSeries[0].circusSpecificExpensesTaxRate,
      attachments: eventsSeries[0].attachments,
    },
    events: [eventsWithPlace[0], eventsWithPlace[1], eventsWithPlace[2]],
  }),
  DeclarationSchema.parse({
    organization: {
      id: organizations[1].id,
      name: organizations[1].name,
      officialId: organizations[1].officialId,
      officialHeadquartersId: organizations[1].officialHeadquartersId,
      headquartersAddress: addresses[1],
      sacemId: organizations[1].sacemId,
      sacdId: organizations[1].sacdId,
    },
    eventSerie: {
      id: eventsSeries[1].id,
      name: eventsSeries[1].name,
      producerOfficialId: eventsSeries[1].producerOfficialId,
      producerName: eventsSeries[1].producerName,
      performanceType: eventsSeries[1].performanceType,
      expectedDeclarationTypes: eventsSeries[1].expectedDeclarationTypes,
      place: places[1],
      placeCapacity: eventsSeries[1].placeCapacity,
      audience: eventsSeries[1].audience,
      ticketingRevenueTaxRate: eventsSeries[1].ticketingRevenueTaxRate,
      expensesIncludingTaxes: eventsSeries[1].expensesIncludingTaxes,
      expensesExcludingTaxes: eventsSeries[1].expensesExcludingTaxes,
      expensesTaxRate: eventsSeries[1].expensesTaxRate,
      introductionFeesExpensesIncludingTaxes: eventsSeries[1].introductionFeesExpensesIncludingTaxes,
      introductionFeesExpensesExcludingTaxes: eventsSeries[1].introductionFeesExpensesExcludingTaxes,
      introductionFeesExpensesTaxRate: eventsSeries[1].introductionFeesExpensesTaxRate,
      circusSpecificExpensesIncludingTaxes: eventsSeries[1].circusSpecificExpensesIncludingTaxes,
      circusSpecificExpensesExcludingTaxes: eventsSeries[1].circusSpecificExpensesExcludingTaxes,
      circusSpecificExpensesTaxRate: eventsSeries[1].circusSpecificExpensesTaxRate,
      attachments: eventsSeries[1].attachments,
    },
    events: [eventsWithPlace[1], eventsWithPlace[2]],
  }),
  DeclarationSchema.parse({
    organization: {
      id: organizations[2].id,
      name: organizations[2].name,
      officialId: organizations[2].officialId,
      officialHeadquartersId: organizations[2].officialHeadquartersId,
      headquartersAddress: addresses[2],
      sacemId: organizations[2].sacemId,
      sacdId: organizations[2].sacdId,
    },
    eventSerie: {
      id: eventsSeries[2].id,
      name: eventsSeries[2].name,
      producerOfficialId: eventsSeries[2].producerOfficialId,
      producerName: eventsSeries[2].producerName,
      performanceType: eventsSeries[2].performanceType,
      expectedDeclarationTypes: eventsSeries[2].expectedDeclarationTypes,
      place: null,
      placeCapacity: eventsSeries[2].placeCapacity,
      audience: eventsSeries[2].audience,
      ticketingRevenueTaxRate: eventsSeries[2].ticketingRevenueTaxRate,
      expensesIncludingTaxes: eventsSeries[2].expensesIncludingTaxes,
      expensesExcludingTaxes: eventsSeries[2].expensesExcludingTaxes,
      expensesTaxRate: eventsSeries[2].expensesTaxRate,
      introductionFeesExpensesIncludingTaxes: eventsSeries[2].introductionFeesExpensesIncludingTaxes,
      introductionFeesExpensesExcludingTaxes: eventsSeries[2].introductionFeesExpensesExcludingTaxes,
      introductionFeesExpensesTaxRate: eventsSeries[2].introductionFeesExpensesTaxRate,
      circusSpecificExpensesIncludingTaxes: eventsSeries[2].circusSpecificExpensesIncludingTaxes,
      circusSpecificExpensesExcludingTaxes: eventsSeries[2].circusSpecificExpensesExcludingTaxes,
      circusSpecificExpensesTaxRate: eventsSeries[2].circusSpecificExpensesTaxRate,
      attachments: eventsSeries[2].attachments,
    },
    events: [eventsWithPlace[2]],
  }),
];

export const declarationsWrappers: DeclarationWrapperSchemaType[] = [
  DeclarationWrapperSchema.parse({
    declaration: {
      ...declarations[0],
      eventSerie: {
        ...declarations[0].eventSerie,
        attachments: [
          {
            ...uiAttachments[0],
            type: DeclarationAttachmentTypeSchema.enum.ARTISTIC_CONTRACT,
          },
          {
            ...uiAttachments[1],
            type: DeclarationAttachmentTypeSchema.enum.PERFORMED_WORK_PROGRAM,
          },
        ],
      },
    },
    ticketingSystemName: ticketingSystems[0].name,
    placeholder: {
      producer: [
        {
          officialId: declarations[0].eventSerie.producerOfficialId!,
          name: declarations[0].eventSerie.producerName!,
        },
        {
          officialId: declarations[1].eventSerie.producerOfficialId!,
          name: declarations[1].eventSerie.producerName!,
        },
      ],
      place: [places[1]],
      placeCapacity: [declarations[0].eventSerie.placeCapacity!, declarations[1].eventSerie.placeCapacity!],
    },
    transmissions: [
      {
        type: DeclarationTypeSchema.enum.SACEM,
        status: DeclarationStatusSchema.enum.PROCESSED,
        hasError: false,
      },
    ],
  }),
  DeclarationWrapperSchema.parse({
    declaration: {
      ...declarations[1],
      eventSerie: {
        ...declarations[1].eventSerie,
        attachments: [
          {
            ...uiAttachments[0],
            type: DeclarationAttachmentTypeSchema.enum.OTHER,
          },
        ],
      },
    },
    ticketingSystemName: ticketingSystems[1].name,
    placeholder: {
      producer: [
        {
          officialId: declarations[0].eventSerie.producerOfficialId!,
          name: declarations[0].eventSerie.producerName!,
        },
      ],
      place: [places[2]],
      placeCapacity: [declarations[1].eventSerie.placeCapacity!],
    },
    transmissions: [],
  }),
  DeclarationWrapperSchema.parse({
    declaration: {
      ...declarations[2],
      eventSerie: {
        ...declarations[2].eventSerie,
        attachments: [],
      },
    },
    ticketingSystemName: ticketingSystems[2].name,
    placeholder: {
      producer: [
        {
          officialId: declarations[1].eventSerie.producerOfficialId!,
          name: declarations[1].eventSerie.producerName!,
        },
      ],
      place: [places[0]],
      placeCapacity: [],
    },
    transmissions: [
      {
        type: DeclarationTypeSchema.enum.SACEM,
        status: DeclarationStatusSchema.enum.PENDING,
        hasError: true,
      },
    ],
  }),
];
