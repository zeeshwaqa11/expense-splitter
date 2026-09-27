import { describe, expect, it } from 'vitest';
import { calculateSplit, validatePayers } from '../../src/core/money/splitCalculator.js';

describe('calculateSplit - EQUAL', () => {
  it('distributes evenly with deterministic remainder placement', () => {
    const result = calculateSplit(10000, { splitType: 'EQUAL', memberIds: ['a', 'b', 'c'] });
    expect(result).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it('rejects an empty member list', () => {
    expect(() => calculateSplit(1000, { splitType: 'EQUAL', memberIds: [] })).toThrow();
  });
});

describe('calculateSplit - EXACT', () => {
  it('accepts amounts that sum exactly to the total', () => {
    const result = calculateSplit(1000, {
      splitType: 'EXACT',
      amounts: { a: 600, b: 400 },
    });
    expect(result).toEqual({ a: 600, b: 400 });
  });

  it('rejects amounts that do not sum to the total', () => {
    expect(() =>
      calculateSplit(1000, { splitType: 'EXACT', amounts: { a: 600, b: 300 } }),
    ).toThrow();
  });

  it('rejects zero or negative amounts', () => {
    expect(() =>
      calculateSplit(1000, { splitType: 'EXACT', amounts: { a: 1000, b: 0 } }),
    ).toThrow();
    expect(() =>
      calculateSplit(1000, { splitType: 'EXACT', amounts: { a: 1200, b: -200 } }),
    ).toThrow();
  });
});

describe('calculateSplit - PERCENTAGE', () => {
  it('accepts percentages that sum to 100', () => {
    const result = calculateSplit(10000, {
      splitType: 'PERCENTAGE',
      percentages: { a: 50, b: 30, c: 20 },
    });
    expect(result).toEqual({ a: 5000, b: 3000, c: 2000 });
    expect(Object.values(result).reduce((s, v) => s + v, 0)).toBe(10000);
  });

  it('rejects percentages that do not sum to 100', () => {
    expect(() =>
      calculateSplit(10000, { splitType: 'PERCENTAGE', percentages: { a: 50, b: 40 } }),
    ).toThrow();
  });

  it('handles fractional percentages that still sum to 100', () => {
    const result = calculateSplit(10000, {
      splitType: 'PERCENTAGE',
      percentages: { a: 33.33, b: 33.33, c: 33.34 },
    });
    expect(Object.values(result).reduce((s, v) => s + v, 0)).toBe(10000);
  });
});

describe('calculateSplit - SHARES', () => {
  it('distributes proportionally to shares, e.g. 2:1:1', () => {
    const result = calculateSplit(10000, {
      splitType: 'SHARES',
      shares: { a: 2, b: 1, c: 1 },
    });
    expect(result).toEqual({ a: 5000, b: 2500, c: 2500 });
  });

  it('rejects zero or negative shares', () => {
    expect(() =>
      calculateSplit(1000, { splitType: 'SHARES', shares: { a: 1, b: 0 } }),
    ).toThrow();
  });
});

describe('validatePayers', () => {
  it('accepts multiple payers summing to the total', () => {
    expect(() => validatePayers(10000, { a: 6000, b: 4000 })).not.toThrow();
  });

  it('rejects payers not summing to the total', () => {
    expect(() => validatePayers(10000, { a: 6000, b: 3000 })).toThrow();
  });

  it('rejects zero or negative payer amounts', () => {
    expect(() => validatePayers(10000, { a: 10000, b: 0 })).toThrow();
  });
});
