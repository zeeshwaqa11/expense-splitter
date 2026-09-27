import type { CreateExpensePayload, RecurrenceFrequency, RecurringExpense } from '../types';
import { api } from './client';

export interface CreateRecurringPayload {
  frequency: RecurrenceFrequency;
  dayOfPeriod: number;
  template: Omit<CreateExpensePayload, 'date'>;
}

export function listRecurring(groupId: string) {
  return api.get<{ recurring: RecurringExpense[] }>(`/groups/${groupId}/recurring`);
}

export function createRecurring(groupId: string, input: CreateRecurringPayload) {
  return api.post<{ recurring: RecurringExpense }>(`/groups/${groupId}/recurring`, input);
}

export function deleteRecurring(groupId: string, recurringId: string) {
  return api.delete<void>(`/groups/${groupId}/recurring/${recurringId}`);
}
