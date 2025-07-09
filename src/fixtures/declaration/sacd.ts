import { ensureMinimumSacdAccountingItems } from '@ad/src/core/declaration';
import { eventsSeries } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';
import {
  SacdAccountingCategorySchema,
  SacdDeclarationOrganizationSchema,
  SacdDeclarationOrganizationSchemaType,
  SacdDeclarationSchema,
  SacdDeclarationSchemaType,
  SacdDeclarationWrapperSchema,
  SacdDeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration/sacd';

export const sacdDeclarationOrganizations: SacdDeclarationOrganizationSchemaType[] = [
  SacdDeclarationOrganizationSchema.parse({
    name: 'Diffuseur France',
    officialHeadquartersId: '12345611200001',
    headquartersAddress: {
      id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
      street: '31 rue des Abbesses',
      city: 'Paris',
      postalCode: '75018',
      countryCode: 'FR',
      subdivision: '',
    },
  }),
  SacdDeclarationOrganizationSchema.parse({
    name: `Les spectacles d'Antan`,
    officialHeadquartersId: '12345612200001',
    headquartersAddress: {
      id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
      street: '95 rue Saint-Antoine',
      city: 'Rennes',
      postalCode: '35000',
      countryCode: 'FR',
      subdivision: '',
    },
  }),
  SacdDeclarationOrganizationSchema.parse({
    name: 'Modern Shows',
    officialHeadquartersId: '12345613200001',
    headquartersAddress: {
      id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
      street: '23 avenue de la Bourdonnais',
      city: 'Lyon',
      postalCode: '69000',
      countryCode: 'FR',
      subdivision: '',
    },
  }),
];

export const sacdDeclarations: SacdDeclarationSchemaType[] = [
  SacdDeclarationSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
    eventSerieId: eventsSeries[0].id,
    clientId: '23434',
    placeName: 'Salle Hermione',
    placeStreet: `991 rue Cousin d'Alésia`,
    placePostalCode: '33000',
    placeCity: 'Bordeaux',
    producer: sacdDeclarationOrganizations[1],
    organizationName: organizations[0].name,
    eventSerieName: eventsSeries[0].name,
    averageTicketPrice: 318,
    accountingEntries: ensureMinimumSacdAccountingItems([
      {
        category: SacdAccountingCategorySchema.Values.INTRODUCTION_FEES,
        categoryPrecision: null,
        taxRate: 0.2,
        includingTaxesAmount: 2368,
      },
      {
        category: SacdAccountingCategorySchema.Values.OTHER,
        categoryPrecision: 'Divers',
        taxRate: 0.2,
        includingTaxesAmount: 930,
      },
    ]),
    transmittedAt: null,
  }),
  SacdDeclarationSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e02',
    eventSerieId: eventsSeries[1].id,
    clientId: '91384',
    placeName: 'Agora',
    placeStreet: '652 rue Scholastique Delesseux',
    placePostalCode: '29200',
    placeCity: 'Brest',
    producer: sacdDeclarationOrganizations[2],
    organizationName: organizations[1].name,
    eventSerieName: eventsSeries[1].name,
    averageTicketPrice: 381,
    accountingEntries: ensureMinimumSacdAccountingItems([
      {
        category: SacdAccountingCategorySchema.Values.SALE_OF_RIGHTS,
        categoryPrecision: null,
        taxRate: 0.055,
        includingTaxesAmount: 422,
      },
      {
        category: SacdAccountingCategorySchema.Values.REVENUE_GUARANTEE,
        categoryPrecision: null,
        taxRate: 0.2,
        includingTaxesAmount: 244,
      },
      {
        category: SacdAccountingCategorySchema.Values.OTHER,
        categoryPrecision: 'Divers',
        taxRate: 0.2,
        includingTaxesAmount: 260,
      },
    ]),
    transmittedAt: null,
  }),
  SacdDeclarationSchema.parse({
    id: 'd79cb3ba-745e-5d9a-8903-4a02327a7e03',
    eventSerieId: eventsSeries[2].id,
    clientId: '12947',
    placeName: 'Grande salle',
    placeStreet: `53 rue Loup d'Assas`,
    placePostalCode: '75001',
    placeCity: 'Paris',
    producer: sacdDeclarationOrganizations[0],
    organizationName: organizations[2].name,
    eventSerieName: eventsSeries[2].name,
    averageTicketPrice: 931,
    accountingEntries: ensureMinimumSacdAccountingItems([
      {
        category: SacdAccountingCategorySchema.Values.SALE_OF_RIGHTS,
        categoryPrecision: null,
        taxRate: 0.055,
        includingTaxesAmount: 7385,
      },
    ]),
    transmittedAt: new Date('December 31, 2024 10:00:00 UTC'),
  }),
];

export const sacdDeclarationsWrappers: SacdDeclarationWrapperSchemaType[] = [
  SacdDeclarationWrapperSchema.parse({
    declaration: sacdDeclarations[0],
    placeholder: {
      clientId: [sacdDeclarations[0].clientId, sacdDeclarations[1].clientId],
      placeName: [sacdDeclarations[0].placeName],
      placeStreet: [sacdDeclarations[0].placeStreet],
      placePostalCode: [sacdDeclarations[0].placePostalCode],
      placeCity: [sacdDeclarations[0].placeCity],
      producer: {
        name: [sacdDeclarations[0].producer.name, sacdDeclarations[1].producer.name],
        officialHeadquartersId: [sacdDeclarations[0].producer.officialHeadquartersId, sacdDeclarations[1].producer.officialHeadquartersId],
        headquartersAddress: {
          street: [sacdDeclarations[0].producer.headquartersAddress.street, sacdDeclarations[1].producer.headquartersAddress.street],
          city: [sacdDeclarations[0].producer.headquartersAddress.city, sacdDeclarations[1].producer.headquartersAddress.city],
          postalCode: [sacdDeclarations[0].producer.headquartersAddress.postalCode, sacdDeclarations[1].producer.headquartersAddress.postalCode],
          countryCode: [sacdDeclarations[0].producer.headquartersAddress.countryCode, sacdDeclarations[1].producer.headquartersAddress.countryCode],
          subdivision: [sacdDeclarations[0].producer.headquartersAddress.subdivision, sacdDeclarations[1].producer.headquartersAddress.subdivision],
        },
      },
      organizationName: sacdDeclarations[0].organizationName,
      eventSerieName: sacdDeclarations[0].eventSerieName,
      averageTicketPrice: sacdDeclarations[0].averageTicketPrice,
      accountingEntries: sacdDeclarations[0].accountingEntries,
      accountingEntriesOptions: {
        saleOfRights: { taxRate: [], amount: [] },
        introductionFees: {
          taxRate: [sacdDeclarations[0].accountingEntries[0].taxRate!],
          amount: [sacdDeclarations[0].accountingEntries[0].includingTaxesAmount],
        },
        coproductionContribution: { taxRate: [], amount: [] },
        revenueGuarantee: { taxRate: [], amount: [] },
        other: { taxRate: [], amount: [] },
        otherCategories: [],
      },
    },
  }),
  SacdDeclarationWrapperSchema.parse({
    declaration: sacdDeclarations[1],
    placeholder: {
      clientId: [sacdDeclarations[0].clientId, sacdDeclarations[1].clientId],
      placeName: [sacdDeclarations[1].placeName],
      placeStreet: [sacdDeclarations[1].placeStreet],
      placePostalCode: [sacdDeclarations[1].placePostalCode],
      placeCity: [sacdDeclarations[1].placeCity],
      producer: {
        name: [sacdDeclarations[0].producer.name, sacdDeclarations[2].producer.name],
        officialHeadquartersId: [sacdDeclarations[0].producer.officialHeadquartersId, sacdDeclarations[2].producer.officialHeadquartersId],
        headquartersAddress: {
          street: [sacdDeclarations[0].producer.headquartersAddress.street, sacdDeclarations[2].producer.headquartersAddress.street],
          city: [sacdDeclarations[0].producer.headquartersAddress.city, sacdDeclarations[2].producer.headquartersAddress.city],
          postalCode: [sacdDeclarations[0].producer.headquartersAddress.postalCode, sacdDeclarations[2].producer.headquartersAddress.postalCode],
          countryCode: [sacdDeclarations[0].producer.headquartersAddress.countryCode, sacdDeclarations[2].producer.headquartersAddress.countryCode],
          subdivision: [sacdDeclarations[0].producer.headquartersAddress.subdivision, sacdDeclarations[2].producer.headquartersAddress.subdivision],
        },
      },
      organizationName: sacdDeclarations[1].organizationName,
      eventSerieName: sacdDeclarations[1].eventSerieName,
      averageTicketPrice: sacdDeclarations[1].averageTicketPrice,
      accountingEntries: sacdDeclarations[1].accountingEntries,
      accountingEntriesOptions: {
        saleOfRights: {
          taxRate: [sacdDeclarations[1].accountingEntries[0].taxRate!],
          amount: [sacdDeclarations[1].accountingEntries[0].includingTaxesAmount],
        },
        introductionFees: { taxRate: [], amount: [] },
        coproductionContribution: { taxRate: [], amount: [] },
        revenueGuarantee: { taxRate: [], amount: [] },
        other: { taxRate: [], amount: [] },
        otherCategories: [],
      },
    },
  }),
  SacdDeclarationWrapperSchema.parse({
    declaration: sacdDeclarations[2],
    placeholder: {
      clientId: [sacdDeclarations[0].clientId, sacdDeclarations[1].clientId],
      placeName: [sacdDeclarations[2].placeName],
      placeStreet: [sacdDeclarations[2].placeStreet],
      placePostalCode: [sacdDeclarations[2].placePostalCode],
      placeCity: [sacdDeclarations[2].placeCity],
      producer: {
        name: [sacdDeclarations[1].producer.name, sacdDeclarations[2].producer.name],
        officialHeadquartersId: [sacdDeclarations[1].producer.officialHeadquartersId, sacdDeclarations[2].producer.officialHeadquartersId],
        headquartersAddress: {
          street: [sacdDeclarations[1].producer.headquartersAddress.street, sacdDeclarations[2].producer.headquartersAddress.street],
          city: [sacdDeclarations[1].producer.headquartersAddress.city, sacdDeclarations[2].producer.headquartersAddress.city],
          postalCode: [sacdDeclarations[1].producer.headquartersAddress.postalCode, sacdDeclarations[2].producer.headquartersAddress.postalCode],
          countryCode: [sacdDeclarations[1].producer.headquartersAddress.countryCode, sacdDeclarations[2].producer.headquartersAddress.countryCode],
          subdivision: [sacdDeclarations[1].producer.headquartersAddress.subdivision, sacdDeclarations[2].producer.headquartersAddress.subdivision],
        },
      },
      organizationName: sacdDeclarations[2].organizationName,
      eventSerieName: sacdDeclarations[2].eventSerieName,
      averageTicketPrice: sacdDeclarations[2].averageTicketPrice,
      accountingEntries: sacdDeclarations[2].accountingEntries,
      accountingEntriesOptions: {
        saleOfRights: {
          taxRate: [sacdDeclarations[2].accountingEntries[0].taxRate!],
          amount: [sacdDeclarations[2].accountingEntries[0].includingTaxesAmount],
        },
        introductionFees: { taxRate: [], amount: [] },
        coproductionContribution: { taxRate: [], amount: [] },
        revenueGuarantee: { taxRate: [], amount: [] },
        other: { taxRate: [], amount: [] },
        otherCategories: [],
      },
    },
  }),
];
