import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/core/clock.js';
import {
  createRecurringExpense,
  runDueRecurringExpenses,
} from '../../src/modules/recurring/recurring.service.js';
import { app, authed, createGroupWithMembers, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('recurring expenses', () => {
  it('creates exactly one expense per period even if the job runs twice', async () => {
    const owner = await registerUser({ email: 'rec-owner@test.com' });
    const friend = await registerUser({ email: 'rec-friend@test.com' });
    const groupId = await createGroupWithMembers(owner, [friend]);

    const now = new Date('2026-04-01T01:00:00Z');
    const clock = new FixedClock(now);

    await createRecurringExpense(
      groupId,
      owner.user.id,
      {
        frequency: 'MONTHLY',
        dayOfPeriod: 1,
        template: {
          description: 'Rent',
          totalCents: 100000,
          category: 'RENT',
          payers: [{ userId: owner.user.id, amountCents: 100000 }],
          split: { splitType: 'EQUAL', memberIds: [owner.user.id, friend.user.id] },
        },
      },
      clock,
    );

    const firstRun = await runDueRecurringExpenses(clock);
    const secondRun = await runDueRecurringExpenses(clock);

    expect(firstRun).toBe(1);
    expect(secondRun).toBe(0);

    const expensesRes = await request(app)
      .get(`/api/groups/${groupId}/expenses`)
      .set(authed(owner.token));
    expect(expensesRes.body.expenses).toHaveLength(1);
    expect(expensesRes.body.expenses[0].description).toBe('Rent');

    const recurringListRes = await request(app)
      .get(`/api/groups/${groupId}/recurring`)
      .set(authed(owner.token));
    const nextRunDate = new Date(recurringListRes.body.recurring[0].nextRunDate);
    expect(nextRunDate.toISOString().slice(0, 10)).toBe('2026-05-01');
  });

  it('updates and deletes a recurring rule', async () => {
    const owner = await registerUser({ email: 'rec2-owner@test.com' });
    const groupId = await createGroupWithMembers(owner, []);

    const createRes = await request(app)
      .post(`/api/groups/${groupId}/recurring`)
      .set(authed(owner.token))
      .send({
        frequency: 'MONTHLY',
        dayOfPeriod: 1,
        template: {
          description: 'Internet',
          totalCents: 5000,
          category: 'UTILITIES',
          payers: [{ userId: owner.user.id, amountCents: 5000 }],
          split: { splitType: 'EQUAL', memberIds: [owner.user.id] },
        },
      });
    const recurringId = createRes.body.recurring.id;

    const updateRes = await request(app)
      .patch(`/api/groups/${groupId}/recurring/${recurringId}`)
      .set(authed(owner.token))
      .send({
        frequency: 'WEEKLY',
        dayOfPeriod: 1,
        template: {
          description: 'Internet',
          totalCents: 5500,
          category: 'UTILITIES',
          payers: [{ userId: owner.user.id, amountCents: 5500 }],
          split: { splitType: 'EQUAL', memberIds: [owner.user.id] },
        },
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.recurring.frequency).toBe('WEEKLY');

    const deleteRes = await request(app)
      .delete(`/api/groups/${groupId}/recurring/${recurringId}`)
      .set(authed(owner.token));
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app)
      .get(`/api/groups/${groupId}/recurring`)
      .set(authed(owner.token));
    expect(listRes.body.recurring).toHaveLength(0);
  });

  it('rejects an out-of-range dayOfPeriod for the chosen frequency', async () => {
    const owner = await registerUser({ email: 'rec3-owner@test.com' });
    const groupId = await createGroupWithMembers(owner, []);

    const res = await request(app)
      .post(`/api/groups/${groupId}/recurring`)
      .set(authed(owner.token))
      .send({
        frequency: 'WEEKLY',
        dayOfPeriod: 9,
        template: {
          description: 'Bad',
          totalCents: 100,
          category: 'OTHER',
          payers: [{ userId: owner.user.id, amountCents: 100 }],
          split: { splitType: 'EQUAL', memberIds: [owner.user.id] },
        },
      });
    expect(res.status).toBe(400);
  });
});
