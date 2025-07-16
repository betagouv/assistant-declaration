/**
 * @jest-environment node
 */
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { getDiff } from '@ad/src/utils/comparaison';

describe('getDiff()', () => {
  it('should compare maps of objects', () => {
    const before = new Map([
      [1, { id: 1, myProp: 1 }],
      [2, { id: 2, myProp: 2 }],
      [3, { id: 3, myProp: 3 }],
    ]);

    const after = new Map([
      [2, { id: 2, myProp: 222 }],
      [3, { id: 3, myProp: 3 }],
      [4, { id: 4, myProp: 4 }],
    ]);

    const diffResult = getDiff(before, after);

    expect(diffResult.get(4)?.state).toBe('added');
    expect(diffResult.get(1)?.state).toBe('removed');
    expect(diffResult.get(3)?.state).toBe('unchanged');
    expect(diffResult.get(2)?.state).toBe('updated');
  });

  it('should respect differences option', () => {
    const before = new Map([[2, { id: 2, myProp: 2 }]]);

    const after = new Map([[2, { id: 2, myProp: 222 }]]);

    const diffResult = getDiff(before, after);

    const itemResult = diffResult.get(2);

    assert(itemResult);
    assert(itemResult.state === 'updated');

    expect(itemResult.differences).not.toBeUndefined();

    const diffResultNoDifferences = getDiff(before, after, {
      doNotReportDifferences: true,
    });

    const anotherItemResult = diffResultNoDifferences.get(2);

    assert(anotherItemResult);
    assert(anotherItemResult.state === 'updated');

    expect('differences' in anotherItemResult).toBeFalsy();
  });
});
