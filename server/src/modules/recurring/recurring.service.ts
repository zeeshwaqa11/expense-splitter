import { type Clock, systemClock } from '../../core/clock.js';
import {
  computeFirstRun,
  computeNextRun,
  type RecurrenceFrequency,
} from '../../core/recurrence.js';
import { prisma } from '../../db/client.js';
import { NotFoundError } from '../../utils/errors.js';
import { logActivity } from '../activity/activity.service.js';
import { createExpense } from '../expenses/expenses.service.js';
import { requireMembership } from '../groups/groups.service.js';
import type { CreateRecurringInput, RecurringTemplate } from './recurring.schemas.js';

export async function createRecurringExpense(
  groupId: string,
  actorId: string,
  input: CreateRecurringInput,
  clock: Clock = systemClock,
) {
  await requireMembership(groupId, actorId);
  const nextRunDate = computeFirstRun(input.frequency, input.dayOfPeriod, clock.now());

  return prisma.recurringExpense.create({
    data: {
      groupId,
      template: JSON.stringify(input.template),
      frequency: input.frequency,
      dayOfPeriod: input.dayOfPeriod,
      nextRunDate,
      createdBy: actorId,
    },
  });
}

export async function listRecurringExpenses(groupId: string, actorId: string) {
  await requireMembership(groupId, actorId);
  return prisma.recurringExpense.findMany({
    where: { groupId },
    orderBy: { nextRunDate: 'asc' },
  });
}

async function findOwnedRecurring(groupId: string, recurringId: string) {
  const existing = await prisma.recurringExpense.findUnique({ where: { id: recurringId } });
  if (!existing || existing.groupId !== groupId) {
    throw new NotFoundError('Recurring expense not found');
  }
  return existing;
}

export async function updateRecurringExpense(
  groupId: string,
  recurringId: string,
  actorId: string,
  input: CreateRecurringInput,
  clock: Clock = systemClock,
) {
  await requireMembership(groupId, actorId);
  await findOwnedRecurring(groupId, recurringId);

  const nextRunDate = computeFirstRun(input.frequency, input.dayOfPeriod, clock.now());
  return prisma.recurringExpense.update({
    where: { id: recurringId },
    data: {
      template: JSON.stringify(input.template),
      frequency: input.frequency,
      dayOfPeriod: input.dayOfPeriod,
      nextRunDate,
    },
  });
}

export async function deleteRecurringExpense(
  groupId: string,
  recurringId: string,
  actorId: string,
): Promise<void> {
  await requireMembership(groupId, actorId);
  await findOwnedRecurring(groupId, recurringId);
  await prisma.recurringExpense.delete({ where: { id: recurringId } });
}

export async function runDueRecurringExpenses(clock: Clock = systemClock): Promise<number> {
  const now = clock.now();
  const due = await prisma.recurringExpense.findMany({ where: { nextRunDate: { lte: now } } });

  let created = 0;
  for (const recurring of due) {
    const template = JSON.parse(recurring.template) as RecurringTemplate;
    const expense = await createExpense(recurring.groupId, recurring.createdBy, {
      ...template,
      date: recurring.nextRunDate,
    });

    const nextRunDate = computeNextRun(
      recurring.frequency as RecurrenceFrequency,
      recurring.dayOfPeriod,
      recurring.nextRunDate,
    );
    await prisma.recurringExpense.update({
      where: { id: recurring.id },
      data: { nextRunDate },
    });

    await logActivity(recurring.groupId, recurring.createdBy, 'RECURRING_EXPENSE_CREATED', {
      recurringId: recurring.id,
      expenseId: expense.id,
    });
    created += 1;
  }

  return created;
}
