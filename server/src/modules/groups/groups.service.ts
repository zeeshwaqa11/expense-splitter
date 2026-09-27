import { prisma } from '../../db/client.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../../utils/errors.js';
import { logActivity } from '../activity/activity.service.js';
import { computeNetBalances } from '../balances/balances.service.js';
import type { AddMemberInput, CreateGroupInput, UpdateGroupInput } from './groups.schemas.js';

export async function createGroup(userId: string, input: CreateGroupInput) {
  const memberIds = Array.from(new Set([userId, ...input.memberIds]));

  return prisma.group.create({
    data: {
      name: input.name,
      type: input.type,
      currency: input.currency,
      createdBy: userId,
      members: {
        create: memberIds.map((id) => ({ userId: id })),
      },
    },
    include: { members: { include: { user: true } } },
  });
}

export async function listMyGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: true },
    orderBy: { joinedAt: 'asc' },
  });
  return memberships.map((m) => m.group);
}

export async function requireMembership(groupId: string, userId: string): Promise<void> {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw new NotFoundError('Group not found');
}

export async function isMember(groupId: string, userId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return membership !== null;
}

export async function getGroup(groupId: string, userId: string) {
  await requireMembership(groupId, userId);
  return prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { members: { include: { user: true } } },
  });
}

export async function updateGroup(groupId: string, userId: string, input: UpdateGroupInput) {
  await requireMembership(groupId, userId);
  return prisma.group.update({ where: { id: groupId }, data: input });
}

export async function addMember(groupId: string, actorId: string, target: AddMemberInput) {
  await requireMembership(groupId, actorId);

  const user = target.userId
    ? await prisma.user.findUnique({ where: { id: target.userId } })
    : await prisma.user.findUnique({ where: { email: target.email! } });

  if (!user) throw new NotFoundError('User not found');

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (existing) throw new ConflictError('User is already a member of this group');

  await prisma.groupMember.create({ data: { groupId, userId: user.id } });
  await logActivity(groupId, actorId, 'MEMBER_ADDED', { userId: user.id, name: user.name });

  return { id: user.id, name: user.name, email: user.email };
}

export async function removeMember(
  groupId: string,
  actorId: string,
  targetUserId: string,
): Promise<void> {
  await requireMembership(groupId, actorId);

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!membership) throw new NotFoundError('Membership not found');

  const net = await computeNetBalances(groupId);
  if ((net[targetUserId] ?? 0) !== 0) {
    throw new UnprocessableError('Cannot remove a member with a non-zero balance');
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  await logActivity(groupId, actorId, 'MEMBER_REMOVED', { userId: targetUserId });
}
