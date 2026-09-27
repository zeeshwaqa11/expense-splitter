import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

export const app = createApp();

export async function resetDb(): Promise<void> {
  await prisma.activity.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseRevision.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expensePayer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.user.deleteMany();
}

export interface RegisteredUser {
  token: string;
  user: { id: string; name: string; email: string };
}

export async function registerUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<RegisteredUser> {
  const payload = {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`,
    password: overrides.password ?? 'password123',
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return res.body as RegisteredUser;
}

export function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}
