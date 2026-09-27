export type GroupType = 'HOME' | 'TRIP' | 'COUPLE' | 'OTHER';

export type ExpenseCategory =
  | 'FOOD'
  | 'RENT'
  | 'TRANSPORT'
  | 'UTILITIES'
  | 'ENTERTAINMENT'
  | 'OTHER';

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export type ActivityType =
  | 'EXPENSE_ADDED'
  | 'EXPENSE_EDITED'
  | 'EXPENSE_DELETED'
  | 'EXPENSE_RESTORED'
  | 'SETTLEMENT_RECORDED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'RECURRING_EXPENSE_CREATED';

export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY';
