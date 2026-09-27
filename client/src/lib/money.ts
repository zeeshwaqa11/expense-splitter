export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function dollarsToCents(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}
