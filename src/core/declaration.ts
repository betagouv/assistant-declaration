export const currentTaxRates: number[] = [0, 0.021, 0.055, 0.1, 0.2];

export type EditableAmountSwitch = 'excludingTaxes' | 'includingTaxes';

export function getExcludingTaxesAmountFromIncludingTaxesAmount(includingTaxesAmount: number, taxRate: number): number {
  return includingTaxesAmount / (1 + taxRate);
}

export function getTaxAmountFromIncludingTaxesAmount(includingTaxesAmount: number, taxRate: number): number {
  return includingTaxesAmount - getExcludingTaxesAmountFromIncludingTaxesAmount(includingTaxesAmount, taxRate);
}

export function getIncludingTaxesAmountFromExcludingTaxesAmount(excludingTaxesAmount: number, taxRate: number): number {
  return (1 + taxRate) * excludingTaxesAmount;
}
