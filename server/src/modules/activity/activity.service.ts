import { prisma } from '../../db/client.js';
import type { ActivityType } from '../../types/domain.js';

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
