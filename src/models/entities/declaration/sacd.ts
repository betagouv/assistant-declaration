import { z } from 'zod';

import { AddressInputSchema, AddressSchema } from '@ad/src/models/entities/address';
import { DeclarationSchema } from '@ad/src/models/entities/declaration';
import { duplicateEntryCategoryLabelError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
import { EventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const SacdDeclarationAccountingOtherEntryCategorySchema = z.string().min(1).max(300);
export type SacdDeclarationAccountingOtherEntryCategorySchemaType = z.infer<typeof SacdDeclarationAccountingOtherEntryCategorySchema>;

export const SacdProductionTypeSchema = z.enum(['AMATEUR', 'PROFESSIONAL']);
export type SacdProductionTypeSchemaType = z.infer<typeof SacdProductionTypeSchema>;

export const SacdAudienceSchema = z.enum(['ALL', 'YOUNG', 'SCHOOL', 'READING']);
export type SacdAudienceSchemaType = z.infer<typeof SacdAudienceSchema>;

export const SacdAccountingCategorySchema = z.enum([
  'SALE_OF_RIGHTS',
  'INTRODUCTION_FEES',
  'COPRODUCTION_CONTRIBUTION',
  'REVENUE_GUARANTEE',
  'OTHER',
]);
export type SacdAccountingCategorySchemaType = z.infer<typeof SacdAccountingCategorySchema>;

export const LiteSacdDeclarationAccountingEntrySchema = applyTypedParsers(
  z
    .object({
      category: SacdAccountingCategorySchema,
      categoryPrecision: SacdDeclarationAccountingOtherEntryCategorySchema.nullable(),
      taxRate: z.number().nonnegative().nullable(),
      includingTaxesAmount: z.number().nonnegative(),
    })
    .strict()
);
export type LiteSacdDeclarationAccountingEntrySchemaType = z.infer<typeof LiteSacdDeclarationAccountingEntrySchema>;

export const SacdDeclarationAccountingEntrySchema = applyTypedParsers(
  z
    .object({
      category: SacdAccountingCategorySchema,
      categoryPrecision: SacdDeclarationAccountingOtherEntryCategorySchema.nullable(),
      taxRate: z.number().nonnegative().nullable(),
      includingTaxesAmount: z.number().nonnegative(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.category !== SacdAccountingCategorySchema.Values.OTHER && data.categoryPrecision !== null) {
        ctx.addIssue(customErrorToZodIssue(new Error(`une catégorie connue ne peut avoir de nom personnalisé`)));
      }
    })
);
export type SacdDeclarationAccountingEntrySchemaType = z.infer<typeof SacdDeclarationAccountingEntrySchema>;

export const SacdDeclarationAccountingEntriesSchema = z
  .array(SacdDeclarationAccountingEntrySchema)
  .max(200)
  .superRefine((data, ctx) => {
    // We want to avoid duplicated labels
    const knownEntries = data.filter((entry) => entry.category !== SacdAccountingCategorySchema.Values.OTHER);
    const customEntries = data.filter((entry) => entry.category === SacdAccountingCategorySchema.Values.OTHER);

    const knownLabels = knownEntries.map((other) => other.category);

    if (new Set(knownLabels).size !== knownLabels.length) {
      ctx.addIssue(customErrorToZodIssue(duplicateEntryCategoryLabelError));
    }

    const customLabels = customEntries.map((other) => other.categoryPrecision);

    if (new Set(customLabels).size !== customLabels.length) {
      ctx.addIssue(customErrorToZodIssue(duplicateEntryCategoryLabelError));
    }
  });
export type SacdDeclarationAccountingEntriesSchemaType = z.infer<typeof SacdDeclarationAccountingEntriesSchema>;

export const SacdDeclarationOrganizationSchema = applyTypedParsers(
  z
    .object({
      // id: z.string().uuid(),
      name: z.string().min(1).max(250),
      officialHeadquartersId: z.string().min(1).max(50),
      headquartersAddress: AddressSchema,
    })
    .strict()
);
export type SacdDeclarationOrganizationSchemaType = z.infer<typeof SacdDeclarationOrganizationSchema>;

export const SacdDeclarationOrganizationInputSchema = applyTypedParsers(
  z
    .object({
      name: SacdDeclarationOrganizationSchema.shape.name,
      officialHeadquartersId: SacdDeclarationOrganizationSchema.shape.officialHeadquartersId,
      headquartersAddress: AddressInputSchema,
    })
    .strict()
);
export type SacdDeclarationOrganizationInputSchemaType = z.infer<typeof SacdDeclarationOrganizationInputSchema>;

export const SacdDeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: EventSerieSchema.shape.id,
      // Settable properties
      clientId: z.string().min(1).max(100),
      placeName: z.string().min(1).max(150),
      placeStreet: AddressSchema.shape.street,
      placePostalCode: AddressSchema.shape.postalCode,
      placeCity: AddressSchema.shape.city,
      accountingEntries: SacdDeclarationAccountingEntriesSchema,
      producer: SacdDeclarationOrganizationSchema,
      // Computed properties
      organizationName: OrganizationSchema.shape.name,
      eventSerieName: EventSerieSchema.shape.name,
      averageTicketPrice: z.number().nonnegative(),
      transmittedAt: DeclarationSchema.shape.transmittedAt,
    })
    .strict()
);
export type SacdDeclarationSchemaType = z.infer<typeof SacdDeclarationSchema>;

export const SacdDeclarationAccountingEntryPlaceholderSchema = applyTypedParsers(
  z
    .object({
      taxRate: z.array(z.number().nonnegative()),
      amount: z.array(z.number().nonnegative()),
    })
    .strict()
);
export type SacdDeclarationAccountingEntryPlaceholderSchemaType = z.infer<typeof SacdDeclarationAccountingEntryPlaceholderSchema>;

export const SacdDeclarationOrganizationPlaceholderSchema = applyTypedParsers(
  z
    .object({
      name: z.array(SacdDeclarationOrganizationSchema.shape.name),
      officialHeadquartersId: z.array(SacdDeclarationOrganizationSchema.shape.officialHeadquartersId),
      headquartersAddress: z.object({
        street: z.array(AddressSchema.shape.street),
        city: z.array(AddressSchema.shape.city),
        postalCode: z.array(AddressSchema.shape.postalCode),
        countryCode: z.array(AddressSchema.shape.countryCode),
        subdivision: z.array(AddressSchema.shape.subdivision),
      }),
    })
    .strict()
);
export type SacdDeclarationOrganizationPlaceholderSchemaType = z.infer<typeof SacdDeclarationOrganizationPlaceholderSchema>;

export const SacdDeclarationWrapperSchema = applyTypedParsers(
  z
    .object({
      declaration: SacdDeclarationSchema.nullable(),
      // In case the declaration does not yet exist we pass to the frontend some fields for the UI to help creating the declaration
      placeholder: SacdDeclarationSchema.pick({
        organizationName: true,
        eventSerieName: true,
        averageTicketPrice: true,
        accountingEntries: true,
      }).extend({
        clientId: z.array(SacdDeclarationSchema.shape.clientId),
        placeName: z.array(SacdDeclarationSchema.shape.placeName),
        placeStreet: z.array(SacdDeclarationSchema.shape.placeStreet),
        placePostalCode: z.array(SacdDeclarationSchema.shape.placePostalCode),
        placeCity: z.array(SacdDeclarationSchema.shape.placeCity),
        producer: SacdDeclarationOrganizationPlaceholderSchema,
        accountingEntriesOptions: z.object({
          saleOfRights: SacdDeclarationAccountingEntryPlaceholderSchema,
          introductionFees: SacdDeclarationAccountingEntryPlaceholderSchema,
          coproductionContribution: SacdDeclarationAccountingEntryPlaceholderSchema,
          revenueGuarantee: SacdDeclarationAccountingEntryPlaceholderSchema,
          other: SacdDeclarationAccountingEntryPlaceholderSchema,
          otherCategories: z.array(SacdDeclarationAccountingOtherEntryCategorySchema),
        }),
      }),
    })
    .strict()
);
export type SacdDeclarationWrapperSchemaType = z.infer<typeof SacdDeclarationWrapperSchema>;
