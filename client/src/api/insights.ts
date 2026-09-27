import type { GroupInsights } from '../types';
import { api } from './client';

export function getInsights(groupId: string) {
  return api.get<GroupInsights>(`/groups/${groupId}/insights`);
}

export function getExportCsv(groupId: string) {
  return api.getCsv(`/groups/${groupId}/export.csv`);
}
