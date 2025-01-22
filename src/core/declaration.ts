import {
  SacdAccountingCategorySchema,
  SacdAccountingCategorySchemaType,
  SacdDeclarationAccountingEntrySchemaType,
} from '@ad/src/models/entities/declaration/sacd';
import {
  AccountingCategorySchema,
  AccountingCategorySchemaType,
  SacemDeclarationAccountingFluxEntrySchemaType,
} from '@ad/src/models/entities/declaration/sacem';

const revenueSortOrder: AccountingCategorySchemaType[] = [
  AccountingCategorySchema.Values.TICKETING,
  AccountingCategorySchema.Values.CONSUMPTIONS,
  AccountingCategorySchema.Values.CATERING,
  AccountingCategorySchema.Values.PROGRAM_SALES,
];

const expenseSortOrder: AccountingCategorySchemaType[] = [
  AccountingCategorySchema.Values.ENGAGEMENT_CONTRACTS,
  AccountingCategorySchema.Values.RIGHTS_TRANSFER_CONTRACTS,
  AccountingCategorySchema.Values.COREALIZATION_CONTRACTS,
  AccountingCategorySchema.Values.COPRODUCTION_CONTRACTS,
];

const sacdEntrySortOrder: SacdAccountingCategorySchemaType[] = [
  SacdAccountingCategorySchema.Values.GLOBAL,
  SacdAccountingCategorySchema.Values.SALE_OF_RIGHTS,
  SacdAccountingCategorySchema.Values.INTRODUCTION_FEES,
  SacdAccountingCategorySchema.Values.COPRODUCTION_CONTRIBUTION,
  SacdAccountingCategorySchema.Values.REVENUE_GUARANTEE,
  SacdAccountingCategorySchema.Values.OTHER,
];

const revenueCategoriesToHave: AccountingCategorySchemaType[] = [
  AccountingCategorySchema.Values.TICKETING,
  AccountingCategorySchema.Values.CONSUMPTIONS,
  AccountingCategorySchema.Values.CATERING,
  AccountingCategorySchema.Values.PROGRAM_SALES,
];

const expenseCategoriesToHave: AccountingCategorySchemaType[] = [
  AccountingCategorySchema.Values.ENGAGEMENT_CONTRACTS,
  AccountingCategorySchema.Values.RIGHTS_TRANSFER_CONTRACTS,
  AccountingCategorySchema.Values.COREALIZATION_CONTRACTS,
  AccountingCategorySchema.Values.COPRODUCTION_CONTRACTS,
];

const sacdEntryCategoriesToHave: SacdAccountingCategorySchemaType[] = [
  SacdAccountingCategorySchema.Values.GLOBAL,
  SacdAccountingCategorySchema.Values.SALE_OF_RIGHTS,
  SacdAccountingCategorySchema.Values.INTRODUCTION_FEES,
  SacdAccountingCategorySchema.Values.COPRODUCTION_CONTRIBUTION,
  SacdAccountingCategorySchema.Values.REVENUE_GUARANTEE,
];

export function ensureMinimumSacemRevenueItems(
  items: SacemDeclarationAccountingFluxEntrySchemaType[]
): SacemDeclarationAccountingFluxEntrySchemaType[] {
  const newItems = [...items];

  revenueCategoriesToHave.forEach((category) => {
    if (!newItems.some((item) => item.category === category)) {
      newItems.push({
        category: category,
        categoryPrecision: null,
        taxRate: 0.2, // Set it as default for all... but could vary for specific categories
        includingTaxesAmount: 0,
      });
    }
  });

  return newItems.sort((a, b) => {
    const indexA = revenueSortOrder.indexOf(a.category);
    const indexB = revenueSortOrder.indexOf(b.category);

    // If a category is not in the sortOrder, push it to the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

export function ensureMinimumSacemExpenseItems(
  items: SacemDeclarationAccountingFluxEntrySchemaType[]
): SacemDeclarationAccountingFluxEntrySchemaType[] {
  const newItems = [...items];

  expenseCategoriesToHave.forEach((category) => {
    if (!newItems.some((item) => item.category === category)) {
      newItems.push({
        category: category,
        categoryPrecision: null,
        taxRate: 0.2, // Set it as default for all... but could vary for specific categories
        includingTaxesAmount: 0,
      });
    }
  });

  return newItems.sort((a, b) => {
    const indexA = expenseSortOrder.indexOf(a.category);
    const indexB = expenseSortOrder.indexOf(b.category);

    // If a category is not in the sortOrder, push it to the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

export function ensureMinimumSacdAccountingItems(items: SacdDeclarationAccountingEntrySchemaType[]): SacdDeclarationAccountingEntrySchemaType[] {
  const newItems = [...items];

  sacdEntryCategoriesToHave.forEach((category) => {
    if (!newItems.some((item) => item.category === category)) {
      newItems.push({
        category: category,
        categoryPrecision: null,
        taxRate: 0.055, // Set it as default for all... but could vary for specific categories
        includingTaxesAmount: 0,
      });
    }
  });

  return newItems.sort((a, b) => {
    const indexA = sacdEntrySortOrder.indexOf(a.category);
    const indexB = sacdEntrySortOrder.indexOf(b.category);

    // If a category is not in the sortOrder, push it to the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}
