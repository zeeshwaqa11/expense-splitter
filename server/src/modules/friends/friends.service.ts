import { prisma } from '../../db/client.js';
import { NotFoundError, UnprocessableError } from '../../utils/errors.js';

export async function listFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: { userId },
    include: { friend: true },
    orderBy: { createdAt: 'asc' },
  });

  return friendships.map((f) => ({
    id: f.friend.id,
    name: f.friend.name,
    email: f.friend.email,
  }));
}

export async function addFriend(userId: string, email: string) {
  const friend = await prisma.user.findUnique({ where: { email } });
  if (!friend) throw new NotFoundError('No user found with that email');
  if (friend.id === userId) throw new UnprocessableError('You cannot add yourself as a friend');

  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId, friendId: friend.id } },
  });
  if (existing) throw new UnprocessableError('Already friends with this user');

  await prisma.$transaction([
    prisma.friendship.create({ data: { userId, friendId: friend.id } }),
    prisma.friendship.create({ data: { userId: friend.id, friendId: userId } }),
  ]);

  return { id: friend.id, name: friend.name, email: friend.email };
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await prisma.$transaction([
    prisma.friendship.deleteMany({ where: { userId, friendId } }),
    prisma.friendship.deleteMany({ where: { userId: friendId, friendId: userId } }),
  ]);
}
