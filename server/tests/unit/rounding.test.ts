import { describe, expect, it } from 'vitest';
import { allocateByLargestRemainder } from '../../src/core/money/rounding.js';

describe('allocateByLargestRemainder', () => {
  it('splits 100.00 three ways as 33.34/33.33/33.33 with the extra cent always on the same member', () => {
    const weights = { a: 1, b: 1, c: 1 };
    const first = allocateByLargestRemainder(10000, weights);
    const second = allocateByLargestRemainder(10000, weights);

    expect(first).toEqual(second);
    expect(Object.values(first).reduce((s, v) => s + v, 0)).toBe(10000);

    const sorted = Object.entries(first).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    expect(sorted).toEqual([
      ['a', 3334],
      ['b', 3333],
      ['c', 3333],
    ]);
  });

  it('always sums exactly to the total for arbitrary weights', () => {
    const weights = { a: 7, b: 3, c: 5, d: 1 };
    const result = allocateByLargestRemainder(9999, weights);
    expect(Object.values(result).reduce((s, v) => s + v, 0)).toBe(9999);
  });

  it('gives every unit of weight at least its floor share', () => {
    const weights = { a: 1, b: 1 };
    const result = allocateByLargestRemainder(1, weights);
    const values = Object.values(result).sort((a, b) => a - b);
    expect(values).toEqual([0, 1]);
  });

  it('throws when weights sum to zero or less', () => {
    expect(() => allocateByLargestRemainder(100, {})).toThrow();
  });
});
