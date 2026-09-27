import type { Group, GroupType } from '../types';
import { api } from './client';

export function listGroups() {
  return api.get<{ groups: Group[] }>('/groups');
}

export function getGroup(groupId: string) {
  return api.get<{ group: Group }>(`/groups/${groupId}`);
}

export function createGroup(input: {
  name: string;
  type: GroupType;
  currency: string;
  memberIds?: string[];
}) {
  return api.post<{ group: Group }>('/groups', input);
}

export function updateGroup(groupId: string, input: { name?: string; type?: GroupType }) {
  return api.patch<{ group: Group }>(`/groups/${groupId}`, input);
}

export function addMember(groupId: string, target: { userId?: string; email?: string }) {
  return api.post<{ member: { id: string; name: string; email: string } }>(
    `/groups/${groupId}/members`,
    target,
  );
}

export function removeMember(groupId: string, userId: string) {
  return api.delete<void>(`/groups/${groupId}/members/${userId}`);
}
