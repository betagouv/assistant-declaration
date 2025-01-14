// Instead of using `dinero.js` that is maybe no longer maintained
export const currencyFormatter = new Intl.NumberFormat(getLocale(), {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const currencyFormatterWithNoDecimals = new Intl.NumberFormat(getLocale(), {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// [WORKAROUND] For whatever reason in GitHub Actions `navigator.language` is `en-US@posix` and throws `RangeError: Incorrect locale information provided` (the suffix should not exist?)
// Refs:
// - https://github.com/microsoft/playwright/issues/34046
// - https://github.com/adobe/react-spectrum/issues/7457
function getLocale(): string {
  let locale = (typeof navigator !== 'undefined' && navigator.language) || '';

  try {
    Intl.DateTimeFormat.supportedLocalesOf(locale);

    return locale;
  } catch (_error) {
    return 'fr-FR';
  }
}
