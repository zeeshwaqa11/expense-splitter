import type { GroupBalances } from '../types';
import { api } from './client';

export function getBalances(groupId: string, simplify: boolean) {
  return api.get<GroupBalances>(`/groups/${groupId}/balances?simplify=${simplify}`);
}
