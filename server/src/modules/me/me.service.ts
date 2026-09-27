import { computeNetBalances } from '../balances/balances.service.js';
import { prisma } from '../../db/client.js';

export async function getMySummary(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: true },
  });

  let overallNetCents = 0;
  const groups: { groupId: string; groupName: string; netCents: number }[] = [];

  for (const m of memberships) {
    const net = await computeNetBalances(m.groupId);
    const mine = net[userId] ?? 0;
    overallNetCents += mine;
    groups.push({ groupId: m.groupId, groupName: m.group.name, netCents: mine });
  }

  const groupIds = memberships.map((m) => m.groupId);
  const recentActivity =
    groupIds.length === 0
      ? []
      : await prisma.activity.findMany({
          where: { groupId: { in: groupIds } },
          include: { actor: true, group: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

  return {
    overallNetCents,
    groups,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      groupId: a.groupId,
      groupName: a.group.name,
      type: a.type,
      actorName: a.actor.name,
      payload: JSON.parse(a.payload),
      createdAt: a.createdAt,
    })),
  };
}
