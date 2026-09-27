import type { CreateExpensePayload, Expense, ExpenseRevision } from '../types';
import { api } from './client';

export function listExpenses(groupId: string) {
  return api.get<{ expenses: Expense[] }>(`/groups/${groupId}/expenses`);
}

export function createExpense(groupId: string, input: CreateExpensePayload) {
  return api.post<{ expense: Expense }>(`/groups/${groupId}/expenses`, input);
}

export function getExpense(expenseId: string) {
  return api.get<{ expense: Expense }>(`/expenses/${expenseId}`);
}

export function updateExpense(expenseId: string, input: CreateExpensePayload) {
  return api.put<{ expense: Expense }>(`/expenses/${expenseId}`, input);
}

export function deleteExpense(expenseId: string) {
  return api.delete<void>(`/expenses/${expenseId}`);
}

export function restoreExpense(expenseId: string) {
  return api.post<{ restored: boolean }>(`/expenses/${expenseId}/restore`);
}

export function getExpenseHistory(expenseId: string) {
  return api.get<{ history: ExpenseRevision[] }>(`/expenses/${expenseId}/history`);
}
