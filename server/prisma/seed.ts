import bcrypt from 'bcrypt';
import { allocateByLargestRemainder } from '../src/core/money/rounding.js';
import { prisma } from '../src/db/client.js';
import { createExpense } from '../src/modules/expenses/expenses.service.js';
import { createRecurringExpense } from '../src/modules/recurring/recurring.service.js';
import { createSettlement } from '../src/modules/settlements/settlements.service.js';

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

const CATEGORY_DESCRIPTIONS: Record<string, string[]> = {
  FOOD: ['Groceries', 'Dinner out', 'Pizza night', 'Takeout', 'Brunch'],
  RENT: ['Rent top-up', 'Deposit share'],
  TRANSPORT: ['Uber ride', 'Gas fill-up', 'Train tickets', 'Airport taxi'],
  UTILITIES: ['Electricity bill', 'Internet bill', 'Water bill'],
  ENTERTAINMENT: ['Movie tickets', 'Bowling night', 'Concert tickets', 'Streaming subscription'],
  OTHER: ['Cleaning supplies', 'Misc supplies', 'Gift for the group'],
};
const CATEGORIES = Object.keys(CATEGORY_DESCRIPTIONS);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function daysAgo(n: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - n);
  return date;
}

interface SeedUser {
  id: string;
  name: string;
}

async function generateExpensesForGroup(
  groupId: string,
  members: SeedUser[],
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i++) {
    const category = CATEGORIES[i % CATEGORIES.length]!;
    const description = pick(CATEGORY_DESCRIPTIONS[category]!);
    const totalCents = randomInt(500, 15000);
    const date = daysAgo(randomInt(0, 89));
    const actor = pick(members);

    const payers =
      i % 5 === 0 && members.length >= 2
        ? (() => {
            const [p1, p2] = [members[0]!, members[1]!];
            const amounts = allocateByLargestRemainder(totalCents, { [p1.id]: 6, [p2.id]: 4 });
            return [
              { userId: p1.id, amountCents: amounts[p1.id]! },
              { userId: p2.id, amountCents: amounts[p2.id]! },
            ];
          })()
        : [{ userId: actor.id, amountCents: totalCents }];

    const splitTypeIndex = i % 4;
    const split =
      splitTypeIndex === 0
        ? { splitType: 'EQUAL' as const, memberIds: members.map((m) => m.id) }
        : splitTypeIndex === 1
          ? (() => {
              const weights = Object.fromEntries(members.map((m) => [m.id, randomInt(1, 5)]));
              const amounts = allocateByLargestRemainder(totalCents, weights);
              return { splitType: 'EXACT' as const, amounts };
            })()
          : splitTypeIndex === 2
            ? (() => {
                const weights = Object.fromEntries(members.map((m) => [m.id, randomInt(1, 5)]));
                const basisPoints = allocateByLargestRemainder(10000, weights);
                const percentages = Object.fromEntries(
                  Object.entries(basisPoints).map(([id, bp]) => [id, bp / 100]),
                );
                return { splitType: 'PERCENTAGE' as const, percentages };
              })()
            : {
                splitType: 'SHARES' as const,
                shares: Object.fromEntries(members.map((m) => [m.id, randomInt(1, 4)])),
              };

    await createExpense(groupId, actor.id, {
      description,
      totalCents,
      category: category as
        | 'FOOD'
        | 'RENT'
        | 'TRANSPORT'
        | 'UTILITIES'
        | 'ENTERTAINMENT'
        | 'OTHER',
      date,
      payers,
      split,
    });
  }
}

async function generateSettlements(groupId: string, members: SeedUser[], count: number) {
  for (let i = 0; i < count; i++) {
    const from = members[i % members.length]!;
    const to = members[(i + 1) % members.length]!;
    await createSettlement(groupId, from.id, {
      fromUserId: from.id,
      toUserId: to.id,
      amountCents: randomInt(500, 5000),
      date: daysAgo(randomInt(0, 60)),
    });
  }
}

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

  const flatmateNames = ['ali', 'sara', 'bilal', 'fatima'];
  const flatmates = await prisma.group.create({
    data: {
      name: 'Flatmates',
      type: 'HOME',
      currency: 'USD',
      createdBy: byEmail['ali@example.com']!.id,
      members: { create: flatmateNames.map((n) => ({ userId: byEmail[`${n}@example.com`]!.id })) },
    },
  });

  const tripNames = ['ali', 'omar', 'ayesha', 'hamza', 'zara'];
  const trip = await prisma.group.create({
    data: {
      name: 'Thailand Trip',
      type: 'TRIP',
      currency: 'USD',
      createdBy: byEmail['omar@example.com']!.id,
      members: { create: tripNames.map((n) => ({ userId: byEmail[`${n}@example.com`]!.id })) },
    },
  });

  const officeLunchNames = ['sara', 'bilal', 'omar', 'ayesha'];
  const officeLunch = await prisma.group.create({
    data: {
      name: 'Office Lunch',
      type: 'OTHER',
      currency: 'USD',
      createdBy: byEmail['sara@example.com']!.id,
      members: {
        create: officeLunchNames.map((n) => ({ userId: byEmail[`${n}@example.com`]!.id })),
      },
    },
  });

  const flatmateMembers = flatmateNames.map((n) => byEmail[`${n}@example.com`]!);
  const tripMembers = tripNames.map((n) => byEmail[`${n}@example.com`]!);
  const officeLunchMembers = officeLunchNames.map((n) => byEmail[`${n}@example.com`]!);

  await generateExpensesForGroup(flatmates.id, flatmateMembers, 35);
  await generateExpensesForGroup(trip.id, tripMembers, 30);
  await generateExpensesForGroup(officeLunch.id, officeLunchMembers, 25);

  await generateSettlements(flatmates.id, flatmateMembers, 3);
  await generateSettlements(trip.id, tripMembers, 3);
  await generateSettlements(officeLunch.id, officeLunchMembers, 2);

  await createRecurringExpense(flatmates.id, byEmail['ali@example.com']!.id, {
    frequency: 'MONTHLY',
    dayOfPeriod: 1,
    template: {
      description: 'Rent',
      totalCents: 200000,
      category: 'RENT',
      notes: 'Monthly rent split evenly among flatmates',
      payers: [{ userId: byEmail['ali@example.com']!.id, amountCents: 200000 }],
      split: { splitType: 'EQUAL', memberIds: flatmateMembers.map((m) => m.id) },
    },
  });

  console.log('Seeded users:', createdUsers.length);
  console.log('Seeded groups:', [flatmates, trip, officeLunch].map((g) => g.name).join(', '));
  console.log('Seeded ~90 expenses, settlements and one recurring rent rule');
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
