import { Text } from '@react-pdf/renderer';

// [WORKAROUND] `TFunction` is leaking into React types as soon as I import this current file into a `.tsx` file
// Casting as `any` is fine here due to single determined usage. There are no solution for now as stated into:
// - https://github.com/microsoft/TypeScript/issues/53087
// - https://github.com/i18next/next-i18next/issues/1795
// ---
// import { TFunction } from 'i18next';
// type TFunc = TFunction<'common'[], undefined, 'common'[];
type TFunc = any;

// [WORKAROUND] A locale like "fr-FR" for `new Intl.NumberFormat(...)` uses a specific non-breakable space to separate thousands, which is not supported by `react-pdf`
// Note: this specific space has code 8239 whereas a working other non-breakable space has code 160 (below we use the hexadecimal for unicodes)
// Ref: https://github.com/diegomura/react-pdf/issues/598#issuecomment-2616596942
export function formatAmountForPdf(t: TFunc, amount: number): string {
  const unsafeValue = t('currency.amount', { amount: amount });
  const safeValue = unsafeValue.replace(/\u202F/g, '\u00A0');

  return safeValue;
}
