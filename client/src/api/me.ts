import type { MySummary } from '../types';
import { api } from './client';

export function getMySummary() {
  return api.get<MySummary>('/me/summary');
}
