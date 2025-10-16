export const currentTaxRates: number[] = [0, 0.021, 0.055, 0.1, 0.2];

export type EditableAmountSwitch = 'excludingTaxes' | 'includingTaxes';

//
// [WARNING]
// Some ticketing systems may return only one of the excluding or including taxes amounts
// We may calculate the other one thanks to the tax rate but it has to be rounded with 2 decimals... so the reverse calculation may
// not give the original amount. It's acceptable in accountability.
// Note: we did not use a currency library like Dinejo.js since we are just managing declarations on totals
//

export function getExcludingTaxesAmountFromIncludingTaxesAmount(includingTaxesAmount: number, taxRate: number): number {
  return includingTaxesAmount / (1 + taxRate);
}

export function getTaxAmountFromIncludingTaxesAmount(includingTaxesAmount: number, taxRate: number): number {
  return includingTaxesAmount - getExcludingTaxesAmountFromIncludingTaxesAmount(includingTaxesAmount, taxRate);
}

export function getTaxAmountFromIncludingAndExcludingTaxesAmounts(includingTaxesAmount: number, excludingTaxesAmount: number): number {
  return includingTaxesAmount - excludingTaxesAmount;
}

export function getIncludingTaxesAmountFromExcludingTaxesAmount(excludingTaxesAmount: number, taxRate: number): number {
  return (1 + taxRate) * excludingTaxesAmount;
}

export function truncateFloatAmountNumber(value: number): number {
  return Math.round(value * 100) / 100; // Avoid having more than 2 decimals since not meaningful
}
