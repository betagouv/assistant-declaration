import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';

describe('calculations related to tax rate', () => {
  const includingTaxesAmount = 9.6;
  const taxRate = 0.2;

  describe('getExcludingTaxesAmountFromIncludingTaxesAmount()', () => {
    it('should return the excluding taxes amount', () => {
      expect(getExcludingTaxesAmountFromIncludingTaxesAmount(includingTaxesAmount, taxRate)).toEqual(8);
    });
  });

  describe('getTaxAmountFromIncludingTaxesAmount()', () => {
    it('should return the tax amount', () => {
      expect(getTaxAmountFromIncludingTaxesAmount(includingTaxesAmount, taxRate)).toEqual(1.5999999999999996);
    });
  });
});
