import { type Clock, systemClock } from '../../core/clock.js';
import { calculateSplit, validatePayers } from '../../core/money/splitCalculator.js';
import { prisma } from '../../db/client.js';
import { NotFoundError, UnprocessableError } from '../../utils/errors.js';
import { logActivity } from '../activity/activity.service.js';
import { requireMembership } from '../groups/groups.service.js';
import type { CreateExpenseInput, UpdateExpenseInput } from './expenses.schemas.js';

function buildAmounts(input: CreateExpenseInput | UpdateExpenseInput) {
  const payerAmounts = Object.fromEntries(input.payers.map((p) => [p.userId, p.amountCents]));
  validatePayers(input.totalCents, payerAmounts);
  const splitAmounts = calculateSplit(input.totalCents, input.split);
  return { payerAmounts, splitAmounts };
}

export async function createExpense(groupId: string, actorId: string, input: CreateExpenseInput) {
  await requireMembership(groupId, actorId);
  const { payerAmounts, splitAmounts } = buildAmounts(input);

  const expense = await prisma.expense.create({
    data: {
      groupId,
      description: input.description,
      totalCents: input.totalCents,
      category: input.category,
      date: input.date,
      notes: input.notes,
      splitType: input.split.splitType,
      rawSplitInputs: JSON.stringify(input.split),
      createdBy: actorId,
      payers: {
        create: Object.entries(payerAmounts).map(([userId, amountCents]) => ({
          userId,
          amountCents,
        })),
      },
      splits: {
        create: Object.entries(splitAmounts).map(([userId, amountCents]) => ({
          userId,
          amountCents,
        })),
      },
    },
    include: { payers: true, splits: true },
  });

  await logActivity(groupId, actorId, 'EXPENSE_ADDED', {
    expenseId: expense.id,
    description: expense.description,
    totalCents: expense.totalCents,
  });

  return expense;
}

export async function listExpenses(groupId: string, actorId: string) {
  await requireMembership(groupId, actorId);
  return prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    include: { payers: true, splits: true },
    orderBy: { date: 'desc' },
  });
}

export async function getExpense(expenseId: string, actorId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { payers: true, splits: true },
  });
  if (!expense) throw new NotFoundError('Expense not found');
  await requireMembership(expense.groupId, actorId);
  return expense;
}

export async function updateExpense(
  expenseId: string,
  actorId: string,
  input: UpdateExpenseInput,
) {
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { payers: true, splits: true },
  });
  if (!existing || existing.deletedAt) throw new NotFoundError('Expense not found');
  await requireMembership(existing.groupId, actorId);

  const { payerAmounts, splitAmounts } = buildAmounts(input);

  const snapshot = {
    description: existing.description,
    totalCents: existing.totalCents,
    category: existing.category,
    date: existing.date,
    notes: existing.notes,
    splitType: existing.splitType,
    rawSplitInputs: existing.rawSplitInputs,
    payers: existing.payers.map((p) => ({ userId: p.userId, amountCents: p.amountCents })),
    splits: existing.splits.map((s) => ({ userId: s.userId, amountCents: s.amountCents })),
  };

  await prisma.$transaction([
    prisma.expenseRevision.create({
      data: { expenseId, editorId: actorId, snapshot: JSON.stringify(snapshot) },
    }),
    prisma.expensePayer.deleteMany({ where: { expenseId } }),
    prisma.expenseSplit.deleteMany({ where: { expenseId } }),
    prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: input.description,
        totalCents: input.totalCents,
        category: input.category,
        date: input.date,
        notes: input.notes,
        splitType: input.split.splitType,
        rawSplitInputs: JSON.stringify(input.split),
        payers: {
          create: Object.entries(payerAmounts).map(([userId, amountCents]) => ({
            userId,
            amountCents,
          })),
        },
        splits: {
          create: Object.entries(splitAmounts).map(([userId, amountCents]) => ({
            userId,
            amountCents,
          })),
        },
      },
    }),
  ]);

  await logActivity(existing.groupId, actorId, 'EXPENSE_EDITED', { expenseId });

  return prisma.expense.findUniqueOrThrow({
    where: { id: expenseId },
    include: { payers: true, splits: true },
  });
}

export async function deleteExpense(
  expenseId: string,
  actorId: string,
  clock: Clock = systemClock,
): Promise<void> {
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Expense not found');
  await requireMembership(existing.groupId, actorId);

  await prisma.expense.update({
    where: { id: expenseId },
    data: { deletedAt: clock.now() },
  });
  await logActivity(existing.groupId, actorId, 'EXPENSE_DELETED', { expenseId });
}

export async function restoreExpense(expenseId: string, actorId: string): Promise<void> {
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new NotFoundError('Expense not found');
  if (!existing.deletedAt) throw new UnprocessableError('Expense is not deleted');
  await requireMembership(existing.groupId, actorId);

  await prisma.expense.update({ where: { id: expenseId }, data: { deletedAt: null } });
  await logActivity(existing.groupId, actorId, 'EXPENSE_RESTORED', { expenseId });
}

export async function getExpenseHistory(expenseId: string, actorId: string) {
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new NotFoundError('Expense not found');
  await requireMembership(existing.groupId, actorId);

  const revisions = await prisma.expenseRevision.findMany({
    where: { expenseId },
    include: { editor: true },
    orderBy: { createdAt: 'asc' },
  });

  return revisions.map((r) => ({
    id: r.id,
    editorId: r.editorId,
    editorName: r.editor.name,
    snapshot: JSON.parse(r.snapshot),
    createdAt: r.createdAt,
  }));
}
