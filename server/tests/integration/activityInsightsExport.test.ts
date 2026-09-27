import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authed, createGroupWithMembers, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('activity feed', () => {
  it('logs expense and member activity for the group', async () => {
    const owner = await registerUser({ email: 'act-owner@test.com' });
    const friend = await registerUser({ email: 'act-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Coffee',
        totalCents: 500,
        category: 'FOOD',
        date: '2026-01-01',
        payers: [{ userId: owner.user.id, amountCents: 500 }],
        split: { splitType: 'EQUAL', memberIds: [owner.user.id, friend.user.id] },
      });

    const res = await request(app).get(`/api/groups/${groupId}/activity`).set(authed(owner.token));
    expect(res.status).toBe(200);
    const types = res.body.activity.map((a: { type: string }) => a.type);
    expect(types).toContain('EXPENSE_ADDED');
    expect(types).toContain('MEMBER_ADDED');
  });

  it('returns 404 for a non-member', async () => {
    const owner = await registerUser({ email: 'act2-owner@test.com' });
    const outsider = await registerUser({ email: 'act2-outsider@test.com' });
    const groupId = await createGroupWithMembers(owner, []);

    const res = await request(app)
      .get(`/api/groups/${groupId}/activity`)
      .set(authed(outsider.token));
    expect(res.status).toBe(404);
  });
});

describe('insights', () => {
  it('aggregates spending by category/month and per-member paid vs share', async () => {
    const owner = await registerUser({ email: 'ins-owner@test.com' });
    const friend = await registerUser({ email: 'ins-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token))
      .send({
        description: 'Groceries',
        totalCents: 4000,
        category: 'FOOD',
        date: '2026-02-10',
        payers: [{ userId: owner.user.id, amountCents: 4000 }],
        split: { splitType: 'EQUAL', memberIds: [owner.user.id, friend.user.id] },
      });

    const res = await request(app).get(`/api/groups/${groupId}/insights`).set(authed(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.spendingByCategory).toEqual([
      { month: '2026-02', category: 'FOOD', totalCents: 4000 },
    ]);

    const ownerInsight = res.body.memberInsights.find(
      (m: { userId: string }) => m.userId === owner.user.id,
    );
    expect(ownerInsight.totalPaidCents).toBe(4000);
    expect(ownerInsight.totalShareCents).toBe(2000);
  });
});

describe('CSV export', () => {
  it('exports the group ledger as CSV with expense and settlement rows', async () => {
    const owner = await registerUser({ email: 'csv-owner@test.com' });
    const friend = await registerUser({ email: 'csv-friend@test.com' });
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
      .get(`/api/groups/${groupId}/export.csv`)
      .set(authed(owner.token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('type,date,description,category,totalCents,payers,splits');
    expect(lines[1]).toContain('expense,2026-01-01,Dinner,FOOD,2000');
    expect(lines[2]).toContain('settlement,2026-01-02');
  });
});

describe('/api/me/summary', () => {
  it('reports overall balance across groups and recent activity', async () => {
    const owner = await registerUser({ email: 'me-owner@test.com' });
    const friend = await registerUser({ email: 'me-friend@test.com' });
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

    const res = await request(app).get('/api/me/summary').set(authed(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.overallNetCents).toBe(1000);
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.recentActivity.length).toBeGreaterThan(0);
  });
});
