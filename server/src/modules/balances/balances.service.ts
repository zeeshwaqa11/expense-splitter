import { allocateByLargestRemainder } from '../../core/money/rounding.js';
import { simplifyDebts, type Payment } from '../../core/simplifyDebts.js';
import { prisma } from '../../db/client.js';
import { requireMembership } from '../groups/groups.service.js';

function addDebt(pairMap: Map<string, number>, from: string, to: string, amountCents: number): void {
  if (amountCents === 0) return;
  const [a, b] = from < to ? [from, to] : [to, from];
  const sign = from < to ? 1 : -1;
  const key = `${a}:${b}`;
  pairMap.set(key, (pairMap.get(key) ?? 0) + sign * amountCents);
}

export async function computeNetBalances(groupId: string): Promise<Record<string, number>> {
  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  const net: Record<string, number> = {};
  for (const m of members) net[m.userId] = 0;

  const expenses = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    include: { payers: true, splits: true },
  });
  for (const expense of expenses) {
    for (const payer of expense.payers) {
      net[payer.userId] = (net[payer.userId] ?? 0) + payer.amountCents;
    }
    for (const split of expense.splits) {
      net[split.userId] = (net[split.userId] ?? 0) - split.amountCents;
    }
  }

  const settlements = await prisma.settlement.findMany({ where: { groupId } });
  for (const s of settlements) {
    net[s.fromUserId] = (net[s.fromUserId] ?? 0) + s.amountCents;
    net[s.toUserId] = (net[s.toUserId] ?? 0) - s.amountCents;
  }

  return net;
}

export async function computeRawDebts(groupId: string): Promise<Payment[]> {
  const expenses = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    include: { payers: true, splits: true },
  });

  const pairMap = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.payers.length === 0) continue;
    const payerWeights = Object.fromEntries(expense.payers.map((p) => [p.userId, p.amountCents]));
    for (const split of expense.splits) {
      const allocation = allocateByLargestRemainder(split.amountCents, payerWeights);
      for (const [payerId, amount] of Object.entries(allocation)) {
        if (payerId === split.userId) continue;
        addDebt(pairMap, split.userId, payerId, amount);
      }
    }
  }

  const settlements = await prisma.settlement.findMany({ where: { groupId } });
  for (const s of settlements) {
    addDebt(pairMap, s.toUserId, s.fromUserId, s.amountCents);
  }

  const payments: Payment[] = [];
  for (const [key, value] of pairMap.entries()) {
    if (value === 0) continue;
    const [a, b] = key.split(':') as [string, string];
    if (value > 0) payments.push({ fromUserId: a, toUserId: b, amountCents: value });
    else payments.push({ fromUserId: b, toUserId: a, amountCents: -value });
  }

  return payments;
}

export interface GroupBalances {
  balances: { userId: string; name: string; amountCents: number }[];
  payments: { fromUserId: string; fromName: string; toUserId: string; toName: string; amountCents: number }[];
  simplified: boolean;
}

export async function getGroupBalances(
  groupId: string,
  actorId: string,
  simplify: boolean,
): Promise<GroupBalances> {
  await requireMembership(groupId, actorId);

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true },
  });
  const nameById = Object.fromEntries(members.map((m) => [m.userId, m.user.name]));

  const net = await computeNetBalances(groupId);
  const payments = simplify ? simplifyDebts(net) : await computeRawDebts(groupId);

  return {
    balances: Object.entries(net).map(([userId, amountCents]) => ({
      userId,
      name: nameById[userId] ?? 'Unknown',
      amountCents,
    })),
    payments: payments.map((p) => ({
      fromUserId: p.fromUserId,
      fromName: nameById[p.fromUserId] ?? 'Unknown',
      toUserId: p.toUserId,
      toName: nameById[p.toUserId] ?? 'Unknown',
      amountCents: p.amountCents,
    })),
    simplified: simplify,
  };
}
