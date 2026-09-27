import bcrypt from 'bcrypt';
import { prisma } from '../src/db/client.js';

const DEMO_PASSWORD = 'password123';

const users = [
  { name: 'Ali Khan', email: 'ali@example.com' },
  { name: 'Sara Ahmed', email: 'sara@example.com' },
  { name: 'Bilal Hassan', email: 'bilal@example.com' },
  { name: 'Fatima Noor', email: 'fatima@example.com' },
  { name: 'Omar Farooq', email: 'omar@example.com' },
  { name: 'Ayesha Malik', email: 'ayesha@example.com' },
  { name: 'Hamza Sheikh', email: 'hamza@example.com' },
  { name: 'Zara Iqbal', email: 'zara@example.com' },
];

async function main() {
  await prisma.activity.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseRevision.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expensePayer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const createdUsers = await Promise.all(
    users.map((u) => prisma.user.create({ data: { ...u, passwordHash } })),
  );

  const byEmail = Object.fromEntries(createdUsers.map((u) => [u.email, u]));

  const friendshipRows = [];
  for (let i = 0; i < createdUsers.length; i++) {
    for (let j = 0; j < createdUsers.length; j++) {
      if (i === j) continue;
      friendshipRows.push({
        userId: createdUsers[i]!.id,
        friendId: createdUsers[j]!.id,
      });
    }
  }
  await prisma.friendship.createMany({ data: friendshipRows });

  const flatmates = await prisma.group.create({
    data: {
      name: 'Flatmates',
      type: 'HOME',
      currency: 'USD',
      createdBy: byEmail['ali@example.com']!.id,
      members: {
        create: ['ali', 'sara', 'bilal', 'fatima'].map((n) => ({
          userId: byEmail[`${n}@example.com`]!.id,
        })),
      },
    },
  });

  const trip = await prisma.group.create({
    data: {
      name: 'Thailand Trip',
      type: 'TRIP',
      currency: 'USD',
      createdBy: byEmail['omar@example.com']!.id,
      members: {
        create: ['ali', 'omar', 'ayesha', 'hamza', 'zara'].map((n) => ({
          userId: byEmail[`${n}@example.com`]!.id,
        })),
      },
    },
  });

  const officeLunch = await prisma.group.create({
    data: {
      name: 'Office Lunch',
      type: 'OTHER',
      currency: 'USD',
      createdBy: byEmail['sara@example.com']!.id,
      members: {
        create: ['sara', 'bilal', 'omar', 'ayesha'].map((n) => ({
          userId: byEmail[`${n}@example.com`]!.id,
        })),
      },
    },
  });

  console.log('Seeded users:', createdUsers.length);
  console.log('Seeded groups:', [flatmates, trip, officeLunch].map((g) => g.name).join(', '));
  console.log('Demo login password for every seeded user:', DEMO_PASSWORD);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
