import { describe, expect, it } from 'vitest';
import {
  computeFirstRun,
  computeNextMonthlyRun,
  computeNextRun,
  computeNextWeeklyRun,
} from '../../src/core/recurrence.js';

describe('computeFirstRun - MONTHLY', () => {
  it('returns today when today is already the target day', () => {
    const run = computeFirstRun('MONTHLY', 1, new Date('2026-03-01T12:00:00Z'));
    expect(run.toISOString().slice(0, 10)).toBe('2026-03-01');
  });

  it('returns later this month when the target day has not passed', () => {
    const run = computeFirstRun('MONTHLY', 15, new Date('2026-03-01T00:00:00Z'));
    expect(run.toISOString().slice(0, 10)).toBe('2026-03-15');
  });

  it('rolls over to next month when the target day already passed', () => {
    const run = computeFirstRun('MONTHLY', 1, new Date('2026-03-05T00:00:00Z'));
    expect(run.toISOString().slice(0, 10)).toBe('2026-04-01');
  });

  it('clamps to the last day of a short month', () => {
    const run = computeFirstRun('MONTHLY', 31, new Date('2026-02-01T00:00:00Z'));
    expect(run.toISOString().slice(0, 10)).toBe('2026-02-28');
  });
});

describe('computeNextMonthlyRun', () => {
  it('advances to next month, never returning the same day twice', () => {
    const next = computeNextMonthlyRun(new Date('2026-03-01T00:00:00Z'), 1);
    expect(next.toISOString().slice(0, 10)).toBe('2026-04-01');
  });

  it('wraps across a year boundary', () => {
    const next = computeNextMonthlyRun(new Date('2026-12-01T00:00:00Z'), 1);
    expect(next.toISOString().slice(0, 10)).toBe('2027-01-01');
  });
});

describe('computeNextWeeklyRun', () => {
  it('always advances at least one day, wrapping to next week on a same-day match', () => {
    const sunday = new Date('2026-03-01T00:00:00Z');
    const next = computeNextWeeklyRun(sunday, 0);
    expect(next.toISOString().slice(0, 10)).toBe('2026-03-08');
  });

  it('finds the nearest matching weekday ahead', () => {
    const sunday = new Date('2026-03-01T00:00:00Z');
    const next = computeNextWeeklyRun(sunday, 3);
    expect(next.toISOString().slice(0, 10)).toBe('2026-03-04');
  });
});

describe('computeNextRun', () => {
  it('dispatches to the correct frequency handler', () => {
    const monthly = computeNextRun('MONTHLY', 1, new Date('2026-03-01T00:00:00Z'));
    expect(monthly.toISOString().slice(0, 10)).toBe('2026-04-01');

    const weekly = computeNextRun('WEEKLY', 0, new Date('2026-03-01T00:00:00Z'));
    expect(weekly.toISOString().slice(0, 10)).toBe('2026-03-08');
  });
});
