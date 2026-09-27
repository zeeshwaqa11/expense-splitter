import type { Settlement } from '../types';
import { api } from './client';

export function listSettlements(groupId: string) {
  return api.get<{ settlements: Settlement[] }>(`/groups/${groupId}/settlements`);
}

export function createSettlement(
  groupId: string,
  input: { fromUserId: string; toUserId: string; amountCents: number; date: string },
) {
  return api.post<{ settlement: Settlement }>(`/groups/${groupId}/settlements`, input);
}
