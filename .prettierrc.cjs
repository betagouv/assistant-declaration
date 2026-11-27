module.exports = {
  printWidth: 150,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  plugins: [require.resolve('@trivago/prettier-plugin-sort-imports'), require.resolve('@prettier/plugin-xml')],
  importOrder: ['<THIRD_PARTY_MODULES>', '^@ad/(.*)$', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  xmlQuoteAttributes: 'double',
  xmlSortAttributesByKey: true,
};
