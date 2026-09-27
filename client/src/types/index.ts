export type GroupType = 'HOME' | 'TRIP' | 'COUPLE' | 'OTHER';
export type ExpenseCategory =
  | 'FOOD'
  | 'RENT'
  | 'TRANSPORT'
  | 'UTILITIES'
  | 'ENTERTAINMENT'
  | 'OTHER';
export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';
export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  user: User;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  currency: string;
  createdBy: string;
  createdAt: string;
  members?: GroupMember[];
}

export interface ExpensePayer {
  id: string;
  userId: string;
  amountCents: number;
}

export interface ExpenseSplit {
  id: string;
  userId: string;
  amountCents: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  totalCents: number;
  category: ExpenseCategory;
  date: string;
  notes: string | null;
  splitType: SplitType;
  rawSplitInputs: string | null;
  createdBy: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
}

export type SplitInputPayload =
  | { splitType: 'EQUAL'; memberIds: string[] }
  | { splitType: 'EXACT'; amounts: Record<string, number> }
  | { splitType: 'PERCENTAGE'; percentages: Record<string, number> }
  | { splitType: 'SHARES'; shares: Record<string, number> };

export interface CreateExpensePayload {
  description: string;
  totalCents: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  payers: { userId: string; amountCents: number }[];
  split: SplitInputPayload;
}

export interface ExpenseRevision {
  id: string;
  editorId: string;
  editorName: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface Balance {
  userId: string;
  name: string;
  amountCents: number;
}

export interface Payment {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
}

export interface GroupBalances {
  balances: Balance[];
  payments: Payment[];
  simplified: boolean;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  groupId: string;
  template: string;
  frequency: RecurrenceFrequency;
  dayOfPeriod: number;
  nextRunDate: string;
  createdBy: string;
  createdAt: string;
}

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

export interface GroupInsights {
  spendingByCategory: CategoryMonthSpending[];
  memberInsights: MemberInsight[];
}

export interface MySummary {
  overallNetCents: number;
  groups: { groupId: string; groupName: string; netCents: number }[];
  recentActivity: {
    id: string;
    groupId: string;
    groupName: string;
    type: string;
    actorName: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
