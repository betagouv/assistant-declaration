// [WORKAROUND] A locale like "fr-FR" for `new Intl.NumberFormat(...)` uses a specific non-breakable space to separate thousands, which is not supported by `react-pdf`
// Note: this specific space has code 8239 whereas a working other non-breakable space has code 160 (below we use the hexadecimal for unicodes)
// Ref: https://github.com/diegomura/react-pdf/issues/598#issuecomment-2616596942
export function escapeFormattedNumberForPdf(formattedNumber: string): string {
  const safeFormat = formattedNumber.replace(/\u202F/g, '\u00A0');

  return safeFormat;
}
