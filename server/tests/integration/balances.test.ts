import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authed, createGroupWithMembers, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('balances', () => {
  it('simplifies a three-person chain of debts into at most n-1 payments', async () => {
    const a = await registerUser({ email: 'chain-a@test.com' });
    const b = await registerUser({ email: 'chain-b@test.com' });
    const c = await registerUser({ email: 'chain-c@test.com' });
    const groupId = await createGroupWithMembers(a, [b, c]);

    await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(a.token))
      .send({
        description: 'A pays for everyone',
        totalCents: 3000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: a.user.id, amountCents: 3000 }],
        split: { splitType: 'EQUAL', memberIds: [a.user.id, b.user.id, c.user.id] },
      });
    await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(b.token))
      .send({
        description: 'B pays for everyone',
        totalCents: 3000,
        category: 'FOOD',
        date: '2026-01-02',
        payers: [{ userId: b.user.id, amountCents: 3000 }],
        split: { splitType: 'EQUAL', memberIds: [a.user.id, b.user.id, c.user.id] },
      });

    const simplifiedRes = await request(app)
      .get(`/api/groups/${groupId}/balances?simplify=true`)
      .set(authed(a.token));
    expect(simplifiedRes.body.payments.length).toBeLessThanOrEqual(2);

    const totalPaid = simplifiedRes.body.payments.reduce(
      (sum: number, p: { amountCents: number }) => sum + p.amountCents,
      0,
    );
    expect(totalPaid).toBe(2000);
  });

  it('returns 404 for a non-member requesting balances', async () => {
    const owner = await registerUser({ email: 'bal-owner@test.com' });
    const outsider = await registerUser({ email: 'bal-outsider@test.com' });
    const groupId = await createGroupWithMembers(owner, []);

    const res = await request(app)
      .get(`/api/groups/${groupId}/balances`)
      .set(authed(outsider.token));
    expect(res.status).toBe(404);
  });
});

describe('group member removal', () => {
  it('blocks removing a member with a non-zero balance', async () => {
    const owner = await registerUser({ email: 'rm-owner@test.com' });
    const friend = await registerUser({ email: 'rm-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Dinner',
        totalCents: 2000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 2000 }],
        split: { splitType: 'EQUAL', memberIds: [owner.user.id, friend.user.id] },
      });

    const res = await request(app)
      .delete(`/api/groups/${groupId}/members/${friend.user.id}`)
      .set(authed(owner.token));
    expect(res.status).toBe(422);
  });

  it('allows removing a member once their balance is settled to zero', async () => {
    const owner = await registerUser({ email: 'rm2-owner@test.com' });
    const friend = await registerUser({ email: 'rm2-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Dinner',
        totalCents: 2000,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 2000 }],
        split: { splitType: 'EQUAL', memberIds: [owner.user.id, friend.user.id] },
      });

    await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set(authed(friend.token))
      .send({
        fromUserId: friend.user.id,
        toUserId: owner.user.id,
        amountCents: 1000,
        date: '2026-01-02',
      });

    const res = await request(app)
      .delete(`/api/groups/${groupId}/members/${friend.user.id}`)
      .set(authed(owner.token));
    expect(res.status).toBe(204);
  });
});
