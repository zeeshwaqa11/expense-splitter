import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authed, createGroupWithMembers, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('settlements', () => {
  it('records a settlement and updates net balances', async () => {
    const a = await registerUser({ email: 'settle-a@test.com' });
    const b = await registerUser({ email: 'settle-b@test.com' });
    const groupId = await createGroupWithMembers(a, [b]);

    await request(app)
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

    const settleRes = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set(authed(b.token))
      .send({ fromUserId: b.user.id, toUserId: a.user.id, amountCents: 1000, date: '2026-01-02' });
    expect(settleRes.status).toBe(201);

    const balancesRes = await request(app)
      .get(`/api/groups/${groupId}/balances`)
      .set(authed(a.token));
    const net: Record<string, number> = {};
    for (const bal of balancesRes.body.balances) net[bal.userId] = bal.amountCents;
    expect(net[a.user.id]).toBe(0);
    expect(net[b.user.id]).toBe(0);
  });

  it('rejects a settlement between non-members', async () => {
    const a = await registerUser({ email: 'settle2-a@test.com' });
    const outsider = await registerUser({ email: 'settle2-outsider@test.com' });
    const groupId = await createGroupWithMembers(a, []);

    const res = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set(authed(a.token))
      .send({
        fromUserId: a.user.id,
        toUserId: outsider.user.id,
        amountCents: 500,
        date: '2026-01-01',
      });
    expect(res.status).toBe(422);
  });

  it('rejects a settlement with the same fromUserId and toUserId', async () => {
    const a = await registerUser({ email: 'settle3-a@test.com' });
    const groupId = await createGroupWithMembers(a, []);

    const res = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set(authed(a.token))
      .send({ fromUserId: a.user.id, toUserId: a.user.id, amountCents: 500, date: '2026-01-01' });
    expect(res.status).toBe(400);
  });
});
