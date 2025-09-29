import { events, eventsSeries } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';
import { places } from '@ad/src/fixtures/place';
import {
  DeclarationSchema,
  DeclarationSchemaType,
  DeclarationWrapperSchema,
  DeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration/common';

// const { id as id0, endAt as endAt0, ...event0 } = events[0];
// const { id as id1, endAt as endAt1, ...event1 } = events[1];
// const { id as id2, endAt as endAt2, ...event2 } = events[2];

export const declarations: DeclarationSchemaType[] = [
  DeclarationSchema.parse({
    organization: {
      id: organizations[0].id,
      name: organizations[0].name,
      officialId: organizations[0].officialId,
      officialHeadquartersId: organizations[0].officialHeadquartersId,
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
      placeId: eventsSeries[0].placeId,
      placeCapacity: eventsSeries[0].placeCapacity,
      audience: eventsSeries[0].audience,
      taxRate: eventsSeries[0].taxRate,
      expensesAmount: eventsSeries[0].expensesAmount,
    },
    events: [events[0], events[1], events[2]],
  }),
  DeclarationSchema.parse({
    organization: {
      id: organizations[1].id,
      name: organizations[1].name,
      officialId: organizations[1].officialId,
      officialHeadquartersId: organizations[1].officialHeadquartersId,
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
      placeId: eventsSeries[1].placeId,
      placeCapacity: eventsSeries[1].placeCapacity,
      audience: eventsSeries[1].audience,
      taxRate: eventsSeries[1].taxRate,
      expensesAmount: eventsSeries[1].expensesAmount,
    },
    events: [events[1], events[2]],
  }),
  DeclarationSchema.parse({
    organization: {
      id: organizations[2].id,
      name: organizations[2].name,
      officialId: organizations[2].officialId,
      officialHeadquartersId: organizations[2].officialHeadquartersId,
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
      placeId: eventsSeries[2].placeId,
      placeCapacity: eventsSeries[2].placeCapacity,
      audience: eventsSeries[2].audience,
      taxRate: eventsSeries[2].taxRate,
      expensesAmount: eventsSeries[2].expensesAmount,
    },
    events: [events[2]],
  }),
];

export const declarationsWrappers: DeclarationWrapperSchemaType[] = [
  DeclarationWrapperSchema.parse({
    declaration: declarations[0],
    placeholder: {
      producerOfficialId: [declarations[0].eventSerie.producerOfficialId!, declarations[1].eventSerie.producerOfficialId!],
      producerName: [declarations[0].eventSerie.producerName!, declarations[1].eventSerie.producerName!],
      place: [places[1]],
      placeCapacity: [declarations[0].eventSerie.placeCapacity!, declarations[1].eventSerie.placeCapacity!],
    },
  }),
  DeclarationWrapperSchema.parse({
    declaration: declarations[1],
    placeholder: {
      producerOfficialId: [declarations[0].eventSerie.producerOfficialId!],
      producerName: [declarations[0].eventSerie.producerName!],
      place: [places[2]],
      placeCapacity: [declarations[1].eventSerie.placeCapacity!],
    },
  }),
  DeclarationWrapperSchema.parse({
    declaration: declarations[2],
    placeholder: {
      producerOfficialId: [declarations[1].eventSerie.producerOfficialId!],
      producerName: [declarations[1].eventSerie.producerName!],
      place: [places[0]],
      placeCapacity: [],
    },
  }),
];
