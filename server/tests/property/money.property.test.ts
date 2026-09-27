import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { allocateByLargestRemainder } from '../../src/core/money/rounding.js';
import { simplifyDebts } from '../../src/core/simplifyDebts.js';

const memberIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];

interface RandomExpense {
  totalCents: number;
  splitWeights: number[];
  payerWeights: number[];
}

const expenseArb = fc.record({
  totalCents: fc.integer({ min: 1, max: 1_000_000 }),
  splitWeights: fc.array(fc.integer({ min: 1, max: 20 }), {
    minLength: 1,
    maxLength: memberIds.length,
  }),
  payerWeights: fc.array(fc.integer({ min: 1, max: 20 }), {
    minLength: 1,
    maxLength: memberIds.length,
  }),
});

function buildNetBalances(expenses: RandomExpense[]): Record<string, number> {
  const net: Record<string, number> = {};
  for (const id of memberIds) net[id] = 0;

  for (const expense of expenses) {
    const splitIds = memberIds.slice(0, expense.splitWeights.length);
    const payerIds = memberIds.slice(0, expense.payerWeights.length);

    const splitWeightMap = Object.fromEntries(
      splitIds.map((id, i) => [id, expense.splitWeights[i]!]),
    );
    const payerWeightMap = Object.fromEntries(
      payerIds.map((id, i) => [id, expense.payerWeights[i]!]),
    );

    const owed = allocateByLargestRemainder(expense.totalCents, splitWeightMap);
    const paid = allocateByLargestRemainder(expense.totalCents, payerWeightMap);

    for (const id of splitIds) net[id]! -= owed[id]!;
    for (const id of payerIds) net[id]! += paid[id]!;
  }

  return net;
}

describe('money invariants (property-based)', () => {
  it('net balances always sum to exactly zero', () => {
    fc.assert(
      fc.property(fc.array(expenseArb, { minLength: 1, maxLength: 20 }), (expenses) => {
        const net = buildNetBalances(expenses);
        const sum = Object.values(net).reduce((s, v) => s + v, 0);
        expect(sum).toBe(0);
      }),
    );
  });

  it('applying the simplified payments settles every balance to zero', () => {
    fc.assert(
      fc.property(fc.array(expenseArb, { minLength: 1, maxLength: 20 }), (expenses) => {
        const net = buildNetBalances(expenses);
        const payments = simplifyDebts(net);

        const after = { ...net };
        for (const payment of payments) {
          after[payment.fromUserId] = after[payment.fromUserId]! + payment.amountCents;
          after[payment.toUserId] = after[payment.toUserId]! - payment.amountCents;
        }

        for (const balance of Object.values(after)) {
          expect(balance).toBe(0);
        }
      }),
    );
  });

  it('produces at most n-1 payments, where n is the number of members with a non-zero balance', () => {
    fc.assert(
      fc.property(fc.array(expenseArb, { minLength: 1, maxLength: 20 }), (expenses) => {
        const net = buildNetBalances(expenses);
        const payments = simplifyDebts(net);
        const nonZeroMembers = Object.values(net).filter((v) => v !== 0).length;
        expect(payments.length).toBeLessThanOrEqual(Math.max(nonZeroMembers - 1, 0));
      }),
    );
  });
});
