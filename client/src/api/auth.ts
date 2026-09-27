import type { User } from '../types';
import { api } from './client';

export interface AuthResult {
  token: string;
  user: User;
}

export function register(name: string, email: string, password: string) {
  return api.post<AuthResult>('/auth/register', { name, email, password });
}

export function login(email: string, password: string) {
  return api.post<AuthResult>('/auth/login', { email, password });
}

export function me() {
  return api.get<{ user: User }>('/auth/me');
}
