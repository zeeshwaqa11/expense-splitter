export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY';

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function atUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function monthlyOccurrence(year: number, monthIndex: number, dayOfPeriod: number): Date {
  const day = Math.min(dayOfPeriod, daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

export function computeNextMonthlyRun(after: Date, dayOfPeriod: number): Date {
  const base = atUtcMidnight(after);
  const sameMonth = monthlyOccurrence(base.getUTCFullYear(), base.getUTCMonth(), dayOfPeriod);
  if (sameMonth.getTime() > base.getTime()) return sameMonth;
  return monthlyOccurrence(base.getUTCFullYear(), base.getUTCMonth() + 1, dayOfPeriod);
}

export function computeNextWeeklyRun(after: Date, dayOfWeek: number): Date {
  const base = atUtcMidnight(after);
  let diff = (dayOfWeek - base.getUTCDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return new Date(base.getTime() + diff * 24 * 60 * 60 * 1000);
}

export function computeFirstRun(
  frequency: RecurrenceFrequency,
  dayOfPeriod: number,
  from: Date,
): Date {
  const base = atUtcMidnight(from);
  if (frequency === 'MONTHLY') {
    const sameMonth = monthlyOccurrence(base.getUTCFullYear(), base.getUTCMonth(), dayOfPeriod);
    return sameMonth.getTime() >= base.getTime() ? sameMonth : computeNextMonthlyRun(base, dayOfPeriod);
  }
  const diff = (dayOfPeriod - base.getUTCDay() + 7) % 7;
  return new Date(base.getTime() + diff * 24 * 60 * 60 * 1000);
}

export function computeNextRun(
  frequency: RecurrenceFrequency,
  dayOfPeriod: number,
  after: Date,
): Date {
  return frequency === 'MONTHLY'
    ? computeNextMonthlyRun(after, dayOfPeriod)
    : computeNextWeeklyRun(after, dayOfPeriod);
}
