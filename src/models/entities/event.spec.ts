import { z } from 'zod';

import { assertAmountsRespectTaxLogic } from '@ad/src/models/entities/event';

describe('assertAmountsRespectTaxLogic()', () => {
  it('should correctly validate bound amounts with tax logic', () => {
    const schema = z
      .object({
        excAmount: z.number().nonnegative().nullable(),
        incAmount: z.number().nonnegative().nullable(),
      })
      .superRefine((data, ctx) => {
        assertAmountsRespectTaxLogic(data, 'excAmount', 'incAmount', ctx);
      });

    expect(() => schema.parse({ excAmount: null, incAmount: null })).not.toThrow();
    expect(() => schema.parse({ excAmount: 20, incAmount: null })).toThrow();
    expect(() => schema.parse({ excAmount: null, incAmount: 20 })).toThrow();
    expect(() => schema.parse({ excAmount: 20, incAmount: 20 })).not.toThrow();
    expect(() => schema.parse({ excAmount: 20, incAmount: 21 })).not.toThrow();
    expect(() => schema.parse({ excAmount: 20, incAmount: 19 })).toThrow();
    expect(() => schema.parse({ excAmount: 0, incAmount: 20 })).toThrow();
    expect(() => schema.parse({ excAmount: 20, incAmount: 0 })).toThrow();
  });
});
