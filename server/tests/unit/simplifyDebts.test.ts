import { describe, expect, it } from 'vitest';
import { simplifyDebts } from '../../src/core/simplifyDebts.js';

function applyPayments(
  balances: Record<string, number>,
  payments: { fromUserId: string; toUserId: string; amountCents: number }[],
): Record<string, number> {
  const result = { ...balances };
  for (const payment of payments) {
    result[payment.fromUserId] = (result[payment.fromUserId] ?? 0) + payment.amountCents;
    result[payment.toUserId] = (result[payment.toUserId] ?? 0) - payment.amountCents;
  }
  return result;
}

describe('simplifyDebts', () => {
  it('produces no payments when all balances are zero', () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });

  it('produces a single payment for a simple two-person debt', () => {
    const payments = simplifyDebts({ a: 1000, b: -1000 });
    expect(payments).toEqual([{ fromUserId: 'b', toUserId: 'a', amountCents: 1000 }]);
  });

  it('settles every balance to zero for a three-person chain', () => {
    const balances = { a: 2000, b: -500, c: -1500 };
    const payments = simplifyDebts(balances);
    expect(applyPayments(balances, payments)).toEqual({ a: 0, b: 0, c: 0 });
  });

  it('produces at most n-1 payments', () => {
    const balances = { a: 3000, b: 2000, c: -1000, d: -4000 };
    const payments = simplifyDebts(balances);
    expect(payments.length).toBeLessThanOrEqual(Object.keys(balances).length - 1);
  });
});
