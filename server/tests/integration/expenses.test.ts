import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authed, createGroupWithMembers, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

async function getNetBalances(groupId: string, token: string) {
  const res = await request(app).get(`/api/groups/${groupId}/balances`).set(authed(token));
  const net: Record<string, number> = {};
  for (const b of res.body.balances) net[b.userId] = b.amountCents;
  return net;
}

describe('expenses - split types', () => {
  it('splits 100.00 three ways as 33.34/33.33/33.33 with the extra cent always on the same member', async () => {
    const owner = await registerUser({ email: 'a@test.com' });
    const b = await registerUser({ email: 'b@test.com' });
    const c = await registerUser({ email: 'c@test.com' });
    const groupId = await createGroupWithMembers(owner, [b, c]);
    const memberIds = [owner.user.id, b.user.id, c.user.id].sort();

    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Dinner',
        totalCents: 10000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 10000 }],
        split: { splitType: 'EQUAL', memberIds },
      });

    expect(res.status).toBe(201);
    const splits: Record<string, number> = {};
    for (const s of res.body.expense.splits) splits[s.userId] = s.amountCents;
    const sorted = memberIds.map((id) => splits[id]!);
    expect(sorted.reduce((s, v) => s + v, 0)).toBe(10000);
    expect(sorted.filter((v) => v === 3334)).toHaveLength(1);
    expect(sorted.filter((v) => v === 3333)).toHaveLength(2);
    expect(splits[memberIds[0]!]).toBe(3334);
  });

  it('accepts an EXACT split that sums to the total', async () => {
    const owner = await registerUser({ email: 'exact-owner@test.com' });
    const friend = await registerUser({ email: 'exact-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Groceries',
        totalCents: 1000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 1000 }],
        split: { splitType: 'EXACT', amounts: { [owner.user.id]: 600, [friend.user.id]: 400 } },
      });

    expect(res.status).toBe(201);
  });

  it('rejects an EXACT split that does not sum to the total', async () => {
    const owner = await registerUser({ email: 'exact2-owner@test.com' });
    const friend = await registerUser({ email: 'exact2-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Groceries',
        totalCents: 1000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 1000 }],
        split: { splitType: 'EXACT', amounts: { [owner.user.id]: 600, [friend.user.id]: 300 } },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a PERCENTAGE split that does not sum to 100', async () => {
    const owner = await registerUser({ email: 'pct-owner@test.com' });
    const friend = await registerUser({ email: 'pct-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Rent',
        totalCents: 10000,
        category: 'RENT',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 10000 }],
        split: {
          splitType: 'PERCENTAGE',
          percentages: { [owner.user.id]: 60, [friend.user.id]: 30 },
        },
      });

    expect(res.status).toBe(400);
  });

  it('accepts a SHARES split, e.g. 2:1:1', async () => {
    const owner = await registerUser({ email: 'shares-owner@test.com' });
    const b = await registerUser({ email: 'shares-b@test.com' });
    const c = await registerUser({ email: 'shares-c@test.com' });
    const groupId = await createGroupWithMembers(owner, [b, c]);

    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Trip fuel',
        totalCents: 10000,
        category: 'TRANSPORT',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 10000 }],
        split: {
          splitType: 'SHARES',
          shares: { [owner.user.id]: 2, [b.user.id]: 1, [c.user.id]: 1 },
        },
      });

    expect(res.status).toBe(201);
    const splits: Record<string, number> = {};
    for (const s of res.body.expense.splits) splits[s.userId] = s.amountCents;
    expect(splits[owner.user.id]).toBe(5000);
    expect(splits[b.user.id]).toBe(2500);
    expect(splits[c.user.id]).toBe(2500);
  });

  it('rejects payers whose amounts do not sum to the total', async () => {
    const owner = await registerUser({ email: 'payer-owner@test.com' });
    const friend = await registerUser({ email: 'payer-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Utilities',
        totalCents: 1000,
        category: 'UTILITIES',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 400 }],
        split: { splitType: 'EQUAL', memberIds: [owner.user.id, friend.user.id] },
      });

    expect(res.status).toBe(400);
  });

  it('rejects a zero or negative total amount', async () => {
    const owner = await registerUser({ email: 'zero-owner@test.com' });
    const groupId = await createGroupWithMembers(owner, []);

    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Nothing',
        totalCents: 0,
        category: 'OTHER',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 0 }],
        split: { splitType: 'EQUAL', memberIds: [owner.user.id] },
      });

    expect(res.status).toBe(400);
  });
});

describe('expenses - multiple payers', () => {
  it('produces correct balances when two people pay for one expense', async () => {
    const a = await registerUser({ email: 'multi-a@test.com' });
    const b = await registerUser({ email: 'multi-b@test.com' });
    const groupId = await createGroupWithMembers(a, [b]);

    await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(a.token))
      .send({
        description: 'Shared bill',
        totalCents: 10000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [
          { userId: a.user.id, amountCents: 6000 },
          { userId: b.user.id, amountCents: 4000 },
        ],
        split: { splitType: 'EQUAL', memberIds: [a.user.id, b.user.id] },
      });

    const net = await getNetBalances(groupId, a.token);
    expect(net[a.user.id]).toBe(1000);
    expect(net[b.user.id]).toBe(-1000);
  });
});

describe('expenses - edit, delete, restore', () => {
  it('recalculates balances after editing an expense', async () => {
    const a = await registerUser({ email: 'edit-a@test.com' });
    const b = await registerUser({ email: 'edit-b@test.com' });
    const groupId = await createGroupWithMembers(a, [b]);

    const createRes = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(a.token))
      .send({
        description: 'Dinner',
        totalCents: 2000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: a.user.id, amountCents: 2000 }],
        split: { splitType: 'EQUAL', memberIds: [a.user.id, b.user.id] },
      });
    const expenseId = createRes.body.expense.id;

    let net = await getNetBalances(groupId, a.token);
    expect(net[b.user.id]).toBe(-1000);

    const updateRes = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set(authed(a.token))
      .send({
        description: 'Dinner (updated)',
        totalCents: 4000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: a.user.id, amountCents: 4000 }],
        split: { splitType: 'EQUAL', memberIds: [a.user.id, b.user.id] },
      });
    expect(updateRes.status).toBe(200);

    net = await getNetBalances(groupId, a.token);
    expect(net[b.user.id]).toBe(-2000);

    const historyRes = await request(app)
      .get(`/api/expenses/${expenseId}/history`)
      .set(authed(a.token));
    expect(historyRes.body.history).toHaveLength(1);
    expect(historyRes.body.history[0].snapshot.totalCents).toBe(2000);
  });

  it('soft deletes then restores an expense, updating balances both times', async () => {
    const a = await registerUser({ email: 'del-a@test.com' });
    const b = await registerUser({ email: 'del-b@test.com' });
    const groupId = await createGroupWithMembers(a, [b]);

    const createRes = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(a.token))
      .send({
        description: 'Dinner',
        totalCents: 2000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: a.user.id, amountCents: 2000 }],
        split: { splitType: 'EQUAL', memberIds: [a.user.id, b.user.id] },
      });
    const expenseId = createRes.body.expense.id;

    const deleteRes = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set(authed(a.token));
    expect(deleteRes.status).toBe(204);

    let net = await getNetBalances(groupId, a.token);
    expect(net[a.user.id]).toBe(0);
    expect(net[b.user.id]).toBe(0);

    const listRes = await request(app)
      .get(`/api/groups/${groupId}/expenses`)
      .set(authed(a.token));
    expect(listRes.body.expenses).toHaveLength(0);

    const restoreRes = await request(app)
      .post(`/api/expenses/${expenseId}/restore`)
      .set(authed(a.token));
    expect(restoreRes.status).toBe(200);

    net = await getNetBalances(groupId, a.token);
    expect(net[b.user.id]).toBe(-1000);
  });
});

describe('expenses - authorization', () => {
  it('returns 404 for a non-member listing a group expenses', async () => {
    const owner = await registerUser({ email: 'auth-owner@test.com' });
    const outsider = await registerUser({ email: 'auth-outsider@test.com' });
    const groupId = await createGroupWithMembers(owner, []);

    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses`)
      .set(authed(outsider.token));
    expect(res.status).toBe(404);
  });

  it('returns 404 for a non-member fetching a single expense', async () => {
    const owner = await registerUser({ email: 'auth2-owner@test.com' });
    const outsider = await registerUser({ email: 'auth2-outsider@test.com' });
    const groupId = await createGroupWithMembers(owner, []);

    const createRes = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Solo',
        totalCents: 500,
        category: 'OTHER',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 500 }],
        split: { splitType: 'EQUAL', memberIds: [owner.user.id] },
      });

    const res = await request(app)
      .get(`/api/expenses/${createRes.body.expense.id}`)
      .set(authed(outsider.token));
    expect(res.status).toBe(404);
  });
});
