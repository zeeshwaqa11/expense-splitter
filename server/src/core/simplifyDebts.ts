export interface Payment {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

interface Balance {
  id: string;
  amount: number;
}

function sortDesc(list: Balance[]): void {
  list.sort((a, b) => b.amount - a.amount || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function simplifyDebts(netBalances: Record<string, number>): Payment[] {
  let creditors: Balance[] = Object.entries(netBalances)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount }));
  let debtors: Balance[] = Object.entries(netBalances)
    .filter(([, amount]) => amount < 0)
    .map(([id, amount]) => ({ id, amount: -amount }));

  const payments: Payment[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    sortDesc(creditors);
    sortDesc(debtors);

    const creditor = creditors[0]!;
    const debtor = debtors[0]!;
    const settled = Math.min(creditor.amount, debtor.amount);

    payments.push({ fromUserId: debtor.id, toUserId: creditor.id, amountCents: settled });

    creditor.amount -= settled;
    debtor.amount -= settled;

    creditors = creditors.filter((c) => c.amount > 0);
    debtors = debtors.filter((d) => d.amount > 0);
  }

  return payments;
}
