import {
  SacdAccountingCategorySchema,
  SacdAccountingCategorySchemaType,
  SacdDeclarationAccountingEntrySchemaType,
  SacdDeclarationOrganizationInputSchemaType,
  SacdDeclarationOrganizationPlaceholderSchemaType,
} from '@ad/src/models/entities/declaration/sacd';
import {
  AccountingCategorySchema,
  AccountingCategorySchemaType,
  SacemDeclarationAccountingFluxEntrySchemaType,
} from '@ad/src/models/entities/declaration/sacem';

export const currentTaxRates: number[] = [0, 0.021, 0.055, 0.1, 0.2];

export const defaultSacemAccountingTaxRates: Record<keyof typeof AccountingCategorySchema.Values, number> = {
  TICKETING: 0.055,
  CONSUMPTIONS: 0.2,
  CATERING: 0.1,
  PROGRAM_SALES: 0.2,
  OTHER_REVENUES: 0.2,
  ENGAGEMENT_CONTRACTS: 0.055,
  RIGHTS_TRANSFER_CONTRACTS: 0.055,
  COREALIZATION_CONTRACTS: 0.055,
  COPRODUCTION_CONTRACTS: 0.055,
  OTHER_ARTISTIC_CONTRACTS: 0.055,
};

export const defaultSacdAccountingTaxRates: Record<keyof typeof SacdAccountingCategorySchema.Values, number> = {
  GLOBAL: 0.055,
  SALE_OF_RIGHTS: 0.055,
  INTRODUCTION_FEES: 0.055,
  COPRODUCTION_CONTRIBUTION: 0.055,
  REVENUE_GUARANTEE: 0.055,
  OTHER: 0.055,
};

export type EditableAmountSwitch = 'excludingTaxes' | 'includingTaxes';

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
        taxRate: defaultSacemAccountingTaxRates[category],
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
        taxRate: defaultSacemAccountingTaxRates[category],
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
        taxRate: defaultSacdAccountingTaxRates[category],
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

export function getExcludingTaxesAmountFromIncludingTaxesAmount(includingTaxesAmount: number, taxRate: number): number {
  return includingTaxesAmount / (1 + taxRate);
}

export function getTaxAmountFromIncludingTaxesAmount(includingTaxesAmount: number, taxRate: number): number {
  return includingTaxesAmount - getExcludingTaxesAmountFromIncludingTaxesAmount(includingTaxesAmount, taxRate);
}

export function getIncludingTaxesAmountFromExcludingTaxesAmount(excludingTaxesAmount: number, taxRate: number): number {
  return (1 + taxRate) * excludingTaxesAmount;
}

export function sacdOrganizationPlaceholderToOrganizationInput(
  placeholder: SacdDeclarationOrganizationPlaceholderSchemaType
): SacdDeclarationOrganizationInputSchemaType {
  // Since this data comes from registered declarations, the existing index for a field should also exist for other fields
  return {
    name: placeholder.name[0] ?? undefined,
    email: placeholder.email[0] ?? undefined,
    officialHeadquartersId: placeholder.officialHeadquartersId[0] ?? undefined,
    europeanVatId: placeholder.europeanVatId[0] ?? undefined,
    headquartersAddress: {
      street: placeholder.headquartersAddress.street[0] ?? undefined,
      city: placeholder.headquartersAddress.city[0] ?? undefined,
      postalCode: placeholder.headquartersAddress.postalCode[0] ?? undefined,
      countryCode: placeholder.headquartersAddress.countryCode[0] ?? undefined,
      subdivision: placeholder.headquartersAddress.subdivision[0] ?? undefined,
    },
    phone: {
      callingCode: placeholder.phone.callingCode[0] ?? undefined,
      countryCode: placeholder.phone.countryCode[0] ?? undefined,
      number: placeholder.phone.number[0] ?? undefined,
    },
  };
}
