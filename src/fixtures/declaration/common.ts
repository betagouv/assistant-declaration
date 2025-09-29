import { events, eventsSeries } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';
import { places } from '@ad/src/fixtures/place';
import {
  DeclarationSchema,
  DeclarationSchemaType,
  DeclarationWrapperSchema,
  DeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration/common';

export const declarations: DeclarationSchemaType[] = [
  DeclarationSchema.parse({
    organization: organizations[0],
    eventSerie: eventsSeries[0],
    events: [events[0], events[1], events[2]],
  }),
  DeclarationSchema.parse({
    organization: organizations[1],
    eventSerie: eventsSeries[1],
    events: [events[1], events[2]],
  }),
  DeclarationSchema.parse({
    organization: organizations[2],
    eventSerie: eventsSeries[2],
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
      placeCapacity: [declarations[0].eventSerie.placeCapacity!, declarations[2].eventSerie.placeCapacity!],
    },
  }),
  DeclarationWrapperSchema.parse({
    declaration: declarations[1],
    placeholder: {
      producerOfficialId: [declarations[0].eventSerie.producerOfficialId!, declarations[2].eventSerie.producerOfficialId!],
      producerName: [declarations[0].eventSerie.producerName!, declarations[2].eventSerie.producerName!],
      place: [places[2]],
      placeCapacity: [declarations[0].eventSerie.placeCapacity!, declarations[2].eventSerie.placeCapacity!],
    },
  }),
  DeclarationWrapperSchema.parse({
    declaration: declarations[2],
    placeholder: {
      producerOfficialId: [declarations[1].eventSerie.producerOfficialId!, declarations[2].eventSerie.producerOfficialId!],
      producerName: [declarations[1].eventSerie.producerName!, declarations[2].eventSerie.producerName!],
      place: [places[0]],
      placeCapacity: [declarations[0].eventSerie.placeCapacity!, declarations[2].eventSerie.placeCapacity!],
    },
  }),
];
