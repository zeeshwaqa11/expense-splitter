import type { ActivityEntry } from '../types';
import { api } from './client';

export function listActivity(groupId: string) {
  return api.get<{ activity: ActivityEntry[] }>(`/groups/${groupId}/activity`);
}
