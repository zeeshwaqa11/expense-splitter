import type { Friend } from '../types';
import { api } from './client';

export function listFriends() {
  return api.get<{ friends: Friend[] }>('/friends');
}

export function addFriend(email: string) {
  return api.post<{ friend: Friend }>('/friends', { email });
}

export function removeFriend(friendId: string) {
  return api.delete<void>(`/friends/${friendId}`);
}
