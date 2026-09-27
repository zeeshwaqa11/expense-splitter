import { prisma } from '../../db/client.js';
import { UnprocessableError } from '../../utils/errors.js';
import { logActivity } from '../activity/activity.service.js';
import { isMember, requireMembership } from '../groups/groups.service.js';
import type { CreateSettlementInput } from './settlements.schemas.js';

export async function createSettlement(
  groupId: string,
  actorId: string,
  input: CreateSettlementInput,
) {
  await requireMembership(groupId, actorId);

  const [fromIsMember, toIsMember] = await Promise.all([
    isMember(groupId, input.fromUserId),
    isMember(groupId, input.toUserId),
  ]);
  if (!fromIsMember || !toIsMember) {
    throw new UnprocessableError('Both parties must be members of the group');
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      amountCents: input.amountCents,
      date: input.date,
      createdBy: actorId,
    },
  });

  await logActivity(groupId, actorId, 'SETTLEMENT_RECORDED', {
    settlementId: settlement.id,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    amountCents: input.amountCents,
  });

  return settlement;
}

export async function listSettlements(groupId: string, actorId: string) {
  await requireMembership(groupId, actorId);
  return prisma.settlement.findMany({ where: { groupId }, orderBy: { date: 'desc' } });
}
