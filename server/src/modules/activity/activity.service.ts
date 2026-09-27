import { prisma } from '../../db/client.js';
import type { ActivityType } from '../../types/domain.js';
import { requireMembership } from '../groups/groups.service.js';

export async function logActivity(
  groupId: string,
  actorId: string,
  type: ActivityType,
  payload: unknown,
): Promise<void> {
  await prisma.activity.create({
    data: {
      groupId,
      actorId,
      type,
      payload: JSON.stringify(payload),
    },
  });
}

export async function listGroupActivity(groupId: string, actorId: string) {
  await requireMembership(groupId, actorId);

  const activities = await prisma.activity.findMany({
    where: { groupId },
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    actorId: a.actorId,
    actorName: a.actor.name,
    payload: JSON.parse(a.payload),
    createdAt: a.createdAt,
  }));
}
