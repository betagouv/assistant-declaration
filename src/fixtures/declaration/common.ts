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
import {
  DEFAULT_PERFORMANCE_TYPE,
  DEFAULT_PLACE_CAPACITY,
  DEFAULT_PRODUCER_NAME,
  DEFAULT_PRODUCER_OFFICIAL_ID,
  DEFAULT_TAX_RATE,
} from '@ad/src/server/declaration-defaults';

const partialEvents = events.map((event) => {
  const { internalTicketingSystemId, eventSerieId, placeOverrideId, createdAt, updatedAt, ...partialEvent } = event;

  return partialEvent;
});

export const eventsWithPlace: DeclarationSchemaType['events'] = [
  {
    ...partialEvents[0],
    placeOverride: places[1],
    endAt: new Date('2024-12-20T22:00:00Z'),
    audienceOverride: 'ALL',
    ticketingRevenueTaxRateOverride: 0.055,
    consumptionsRevenueTaxRate: DEFAULT_TAX_RATE,
    cateringRevenueTaxRate: DEFAULT_TAX_RATE,
    programSalesRevenueTaxRate: DEFAULT_TAX_RATE,
    otherRevenueTaxRate: DEFAULT_TAX_RATE,
  },
  {
    ...partialEvents[1],
    placeOverride: places[0],
    endAt: new Date('2024-12-02T22:00:00Z'),
    audienceOverride: 'YOUNG',
    ticketingRevenueTaxRateOverride: 0.055,
    consumptionsRevenueTaxRate: DEFAULT_TAX_RATE,
    cateringRevenueTaxRate: DEFAULT_TAX_RATE,
    programSalesRevenueTaxRate: DEFAULT_TAX_RATE,
    otherRevenueTaxRate: DEFAULT_TAX_RATE,
  },
  {
    ...partialEvents[2],
    placeOverride: places[2],
    endAt: new Date('2024-12-15T22:00:00Z'),
    audienceOverride: 'ALL',
    ticketingRevenueTaxRateOverride: 0.055,
    consumptionsRevenueTaxRate: DEFAULT_TAX_RATE,
    cateringRevenueTaxRate: DEFAULT_TAX_RATE,
    programSalesRevenueTaxRate: DEFAULT_TAX_RATE,
    otherRevenueTaxRate: DEFAULT_TAX_RATE,
  },
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
      producerOfficialId: eventsSeries[0].producerOfficialId ?? DEFAULT_PRODUCER_OFFICIAL_ID,
      producerName: eventsSeries[0].producerName ?? DEFAULT_PRODUCER_NAME,
      performanceType: eventsSeries[0].performanceType ?? DEFAULT_PERFORMANCE_TYPE,
      expectedDeclarationTypes: eventsSeries[0].expectedDeclarationTypes,
      place: places[0],
      placeCapacity: eventsSeries[0].placeCapacity ?? DEFAULT_PLACE_CAPACITY,
      audience: eventsSeries[0].audience,
      ticketingRevenueTaxRate: eventsSeries[0].ticketingRevenueTaxRate,
      expensesIncludingTaxes: eventsSeries[0].expensesIncludingTaxes,
      expensesExcludingTaxes: eventsSeries[0].expensesExcludingTaxes,
      expensesTaxRate: eventsSeries[0].expensesTaxRate ?? DEFAULT_TAX_RATE,
      introductionFeesExpensesIncludingTaxes: eventsSeries[0].introductionFeesExpensesIncludingTaxes,
      introductionFeesExpensesExcludingTaxes: eventsSeries[0].introductionFeesExpensesExcludingTaxes,
      introductionFeesExpensesTaxRate: eventsSeries[0].introductionFeesExpensesTaxRate ?? DEFAULT_TAX_RATE,
      circusSpecificExpensesIncludingTaxes: eventsSeries[0].circusSpecificExpensesIncludingTaxes ?? 0,
      circusSpecificExpensesExcludingTaxes: eventsSeries[0].circusSpecificExpensesExcludingTaxes ?? 0,
      circusSpecificExpensesTaxRate: eventsSeries[0].circusSpecificExpensesTaxRate ?? DEFAULT_TAX_RATE,
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
      producerOfficialId: eventsSeries[1].producerOfficialId ?? DEFAULT_PRODUCER_OFFICIAL_ID,
      producerName: eventsSeries[1].producerName ?? DEFAULT_PRODUCER_NAME,
      performanceType: eventsSeries[1].performanceType ?? 'COMEDY_AND_STAND_UP',
      expectedDeclarationTypes: eventsSeries[1].expectedDeclarationTypes,
      place: places[1],
      placeCapacity: eventsSeries[1].placeCapacity ?? DEFAULT_PLACE_CAPACITY,
      audience: eventsSeries[1].audience,
      ticketingRevenueTaxRate: eventsSeries[1].ticketingRevenueTaxRate,
      expensesIncludingTaxes: eventsSeries[1].expensesIncludingTaxes,
      expensesExcludingTaxes: eventsSeries[1].expensesExcludingTaxes,
      expensesTaxRate: eventsSeries[1].expensesTaxRate ?? DEFAULT_TAX_RATE,
      introductionFeesExpensesIncludingTaxes: eventsSeries[1].introductionFeesExpensesIncludingTaxes,
      introductionFeesExpensesExcludingTaxes: eventsSeries[1].introductionFeesExpensesExcludingTaxes,
      introductionFeesExpensesTaxRate: eventsSeries[1].introductionFeesExpensesTaxRate ?? DEFAULT_TAX_RATE,
      circusSpecificExpensesIncludingTaxes: eventsSeries[1].circusSpecificExpensesIncludingTaxes ?? 0,
      circusSpecificExpensesExcludingTaxes: eventsSeries[1].circusSpecificExpensesExcludingTaxes ?? 0,
      circusSpecificExpensesTaxRate: eventsSeries[1].circusSpecificExpensesTaxRate ?? DEFAULT_TAX_RATE,
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
      producerOfficialId: eventsSeries[2].producerOfficialId ?? DEFAULT_PRODUCER_OFFICIAL_ID,
      producerName: eventsSeries[2].producerName ?? DEFAULT_PRODUCER_NAME,
      performanceType: eventsSeries[2].performanceType ?? 'DANCE',
      expectedDeclarationTypes: eventsSeries[2].expectedDeclarationTypes,
      place: null,
      placeCapacity: eventsSeries[2].placeCapacity ?? DEFAULT_PLACE_CAPACITY,
      audience: eventsSeries[2].audience,
      ticketingRevenueTaxRate: eventsSeries[2].ticketingRevenueTaxRate,
      expensesIncludingTaxes: eventsSeries[2].expensesIncludingTaxes,
      expensesExcludingTaxes: eventsSeries[2].expensesExcludingTaxes,
      expensesTaxRate: eventsSeries[2].expensesTaxRate ?? DEFAULT_TAX_RATE,
      introductionFeesExpensesIncludingTaxes: eventsSeries[2].introductionFeesExpensesIncludingTaxes,
      introductionFeesExpensesExcludingTaxes: eventsSeries[2].introductionFeesExpensesExcludingTaxes,
      introductionFeesExpensesTaxRate: eventsSeries[2].introductionFeesExpensesTaxRate ?? DEFAULT_TAX_RATE,
      circusSpecificExpensesIncludingTaxes: eventsSeries[2].circusSpecificExpensesIncludingTaxes ?? 0,
      circusSpecificExpensesExcludingTaxes: eventsSeries[2].circusSpecificExpensesExcludingTaxes ?? 0,
      circusSpecificExpensesTaxRate: eventsSeries[2].circusSpecificExpensesTaxRate ?? DEFAULT_TAX_RATE,
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
