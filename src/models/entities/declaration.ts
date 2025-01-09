import { z } from 'zod';

import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
import { duplicateFluxEntryCategoryLabelError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';
import { EventSerieSchema } from '@ad/src/models/entities/event';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { applyTypedParsers } from '@ad/src/utils/zod';

export const SacemDeclarationAccountingOtherEntryCategorySchema = z.string().min(1).max(300);
export type SacemDeclarationAccountingOtherEntryCategorySchemaType = z.infer<typeof SacemDeclarationAccountingOtherEntryCategorySchema>;

export const AccountingFluxSchema = z.enum(['REVENUE', 'EXPENSE']);
export type AccountingFluxSchemaType = z.infer<typeof AccountingFluxSchema>;

export const AccountingCategorySchema = z.enum([
  'TICKETING',
  'CONSUMPTIONS',
  'CATERING',
  'PROGRAM_SALES',
  'OTHER_REVENUES',
  'ENGAGEMENT_CONTRACTS',
  'RIGHTS_TRANSFER_CONTRACTS',
  'COREALIZATION_CONTRACTS',
  'COPRODUCTION_CONTRACTS',
  'OTHER_ARTISTIC_CONTRACTS',
]);
export type AccountingCategorySchemaType = z.infer<typeof AccountingCategorySchema>;

export const LiteSacemDeclarationAccountingEntrySchema = applyTypedParsers(
  z
    .object({
      flux: AccountingFluxSchema,
      category: AccountingCategorySchema,
      categoryPrecision: SacemDeclarationAccountingOtherEntryCategorySchema.nullable(),
      taxRate: z.number().nonnegative(),
      includingTaxesAmount: z.number().nonnegative(),
    })
    .strict()
);
export type LiteSacemDeclarationAccountingEntrySchemaType = z.infer<typeof LiteSacemDeclarationAccountingEntrySchema>;

export const DeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: z.string().uuid(),
      status: DeclarationStatusSchema,
    })
    .strict()
);
export type DeclarationSchemaType = z.infer<typeof DeclarationSchema>;

export const SacemDeclarationAccountingFluxEntrySchema = applyTypedParsers(
  z
    .object({
      category: AccountingCategorySchema,
      categoryPrecision: SacemDeclarationAccountingOtherEntryCategorySchema.nullable(),
      taxRate: z.number().nonnegative(),
      includingTaxesAmount: z.number().nonnegative(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (
        data.category !== AccountingCategorySchema.Values.OTHER_REVENUES &&
        data.category !== AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS &&
        data.categoryPrecision !== null
      ) {
        ctx.addIssue(customErrorToZodIssue(new Error(`une catégorie connue ne peut avoir de nom personnalisé`)));
      }
    })
);
export type SacemDeclarationAccountingFluxEntrySchemaType = z.infer<typeof SacemDeclarationAccountingFluxEntrySchema>;

export const SacemDeclarationAccountingFluxEntriesSchema = z
  .array(SacemDeclarationAccountingFluxEntrySchema)
  .max(200)
  .superRefine((data, ctx) => {
    // We want to avoid duplicated labels
    const knownFluxEntries = data.filter(
      (entry) =>
        entry.category !== AccountingCategorySchema.Values.OTHER_REVENUES &&
        entry.category !== AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS
    );
    const customFluxEntries = data.filter(
      (entry) =>
        entry.category === AccountingCategorySchema.Values.OTHER_REVENUES ||
        entry.category === AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS
    );

    const knownLabels = knownFluxEntries.map((other) => other.category);

    if (new Set(knownLabels).size !== knownLabels.length) {
      ctx.addIssue(customErrorToZodIssue(duplicateFluxEntryCategoryLabelError));
    }

    const customLabels = customFluxEntries.map((other) => other.categoryPrecision);

    if (new Set(customLabels).size !== customLabels.length) {
      ctx.addIssue(customErrorToZodIssue(duplicateFluxEntryCategoryLabelError));
    }
  });
export type SacemDeclarationAccountingFluxEntriesSchemaType = z.infer<typeof SacemDeclarationAccountingFluxEntriesSchema>;

export const SacemDeclarationSchema = applyTypedParsers(
  z
    .object({
      id: z.string().uuid(),
      eventSerieId: z.string().uuid(),
      // Settable properties
      clientId: z.string().min(1).max(100),
      placeName: z.string().min(1).max(150),
      placeCapacity: z.number().int().nonnegative(),
      managerName: z.string().min(1).max(150),
      managerTitle: z.string().min(1).max(150),
      revenues: SacemDeclarationAccountingFluxEntriesSchema,
      expenses: SacemDeclarationAccountingFluxEntriesSchema,
      // Computed properties
      organizationName: OrganizationSchema.shape.name,
      eventSerieName: EventSerieSchema.shape.name,
      eventSerieStartAt: EventSerieSchema.shape.startAt,
      eventSerieEndAt: EventSerieSchema.shape.endAt,
      eventsCount: z.number().int().nonnegative(),
      paidTickets: z.number().int().nonnegative(),
      freeTickets: z.number().int().nonnegative(),
    })
    .strict()
);
export type SacemDeclarationSchemaType = z.infer<typeof SacemDeclarationSchema>;

export const SacemDeclarationAccountingEntryPlaceholderSchema = applyTypedParsers(
  z
    .object({
      taxRate: z.array(z.number().nonnegative()),
      amount: z.array(z.number().nonnegative()),
    })
    .strict()
);
export type SacemDeclarationAccountingEntryPlaceholderSchemaType = z.infer<typeof SacemDeclarationAccountingEntryPlaceholderSchema>;

export const SacemDeclarationWrapperSchema = applyTypedParsers(
  z
    .object({
      declaration: SacemDeclarationSchema.nullable(),
      // In case the declaration does not yet exist we pass to the frontend some fields for the UI to help creating the declaration
      placeholder: SacemDeclarationSchema.pick({
        organizationName: true,
        eventSerieName: true,
        eventSerieStartAt: true,
        eventSerieEndAt: true,
        eventsCount: true,
        paidTickets: true,
        freeTickets: true,
        revenues: true,
        expenses: true,
      }).extend({
        clientId: z.array(SacemDeclarationSchema.shape.clientId),
        placeName: z.array(SacemDeclarationSchema.shape.placeName),
        placeCapacity: z.array(SacemDeclarationSchema.shape.placeCapacity),
        managerName: z.array(SacemDeclarationSchema.shape.managerName),
        managerTitle: z.array(SacemDeclarationSchema.shape.managerTitle),
        revenuesOptions: z.object({
          ticketing: SacemDeclarationAccountingEntryPlaceholderSchema,
          consumptions: SacemDeclarationAccountingEntryPlaceholderSchema,
          catering: SacemDeclarationAccountingEntryPlaceholderSchema,
          programSales: SacemDeclarationAccountingEntryPlaceholderSchema,
          other: SacemDeclarationAccountingEntryPlaceholderSchema,
          otherCategories: z.array(SacemDeclarationAccountingOtherEntryCategorySchema),
        }),
        expensesOptions: z.object({
          engagementContracts: SacemDeclarationAccountingEntryPlaceholderSchema,
          rightsTransferContracts: SacemDeclarationAccountingEntryPlaceholderSchema,
          corealizationContracts: SacemDeclarationAccountingEntryPlaceholderSchema,
          coproductionContracts: SacemDeclarationAccountingEntryPlaceholderSchema,
          other: SacemDeclarationAccountingEntryPlaceholderSchema,
          otherCategories: z.array(SacemDeclarationAccountingOtherEntryCategorySchema),
        }),
      }),
    })
    .strict()
);
export type SacemDeclarationWrapperSchemaType = z.infer<typeof SacemDeclarationWrapperSchema>;
