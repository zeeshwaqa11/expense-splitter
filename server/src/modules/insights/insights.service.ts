import { prisma } from '../../db/client.js';
import { requireMembership } from '../groups/groups.service.js';

export interface CategoryMonthSpending {
  month: string;
  category: string;
  totalCents: number;
}

export interface MemberInsight {
  userId: string;
  name: string;
  totalPaidCents: number;
  totalShareCents: number;
}

export async function getGroupInsights(groupId: string, actorId: string) {
  await requireMembership(groupId, actorId);

  const expenses = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    include: { payers: true, splits: true },
  });

  const byCategoryMonth = new Map<string, number>();
  for (const expense of expenses) {
    const month = expense.date.toISOString().slice(0, 7);
    const key = `${month}|${expense.category}`;
    byCategoryMonth.set(key, (byCategoryMonth.get(key) ?? 0) + expense.totalCents);
  }

  const spendingByCategory: CategoryMonthSpending[] = Array.from(byCategoryMonth.entries()).map(
    ([key, totalCents]) => {
      const [month, category] = key.split('|') as [string, string];
      return { month, category, totalCents };
    },
  );

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true },
  });

  const paid: Record<string, number> = {};
  const share: Record<string, number> = {};
  for (const m of members) {
    paid[m.userId] = 0;
    share[m.userId] = 0;
  }
  for (const expense of expenses) {
    for (const payer of expense.payers) {
      paid[payer.userId] = (paid[payer.userId] ?? 0) + payer.amountCents;
    }
    for (const split of expense.splits) {
      share[split.userId] = (share[split.userId] ?? 0) + split.amountCents;
    }
  }

  const memberInsights: MemberInsight[] = members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    totalPaidCents: paid[m.userId] ?? 0,
    totalShareCents: share[m.userId] ?? 0,
  }));

  return { spendingByCategory, memberInsights };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function exportGroupLedgerCsv(groupId: string, actorId: string): Promise<string> {
  await requireMembership(groupId, actorId);

  const expenses = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    include: { payers: { include: { user: true } }, splits: { include: { user: true } } },
    orderBy: { date: 'asc' },
  });
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: { fromUser: true, toUser: true },
    orderBy: { date: 'asc' },
  });

  const rows: string[] = ['type,date,description,category,totalCents,payers,splits'];

  for (const e of expenses) {
    const payersStr = e.payers.map((p) => `${p.user.name}:${p.amountCents}`).join(';');
    const splitsStr = e.splits.map((s) => `${s.user.name}:${s.amountCents}`).join(';');
    rows.push(
      [
        'expense',
        e.date.toISOString().slice(0, 10),
        csvEscape(e.description),
        e.category,
        String(e.totalCents),
        csvEscape(payersStr),
        csvEscape(splitsStr),
      ].join(','),
    );
  }

  for (const s of settlements) {
    rows.push(
      [
        'settlement',
        s.date.toISOString().slice(0, 10),
        csvEscape(`${s.fromUser.name} paid ${s.toUser.name}`),
        '',
        String(s.amountCents),
        '',
        '',
      ].join(','),
    );
  }

  return rows.join('\n');
}
