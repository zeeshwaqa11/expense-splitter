import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as expensesApi from '../../api/expenses';
import { HttpError } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingState } from '../../components/LoadingState';
import { formatCents } from '../../lib/money';
import type { Expense, GroupMember } from '../../types';

export function ExpensesTab({ groupId, members }: { groupId: string; members: GroupMember[] }) {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameById = Object.fromEntries(members.map((m) => [m.userId, m.user.name]));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  function load() {
    setError(null);
    expensesApi
      .listExpenses(groupId)
      .then((res) => setExpenses(res.expenses))
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Failed to load expenses'));
  }

  if (error) return <ErrorBanner message={error} />;
  if (expenses === null) return <LoadingState label="Loading expenses..." />;

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Expenses</h2>
        <Link className="btn" to={`/groups/${groupId}/expenses/new`}>
          Add expense
        </Link>
      </div>

      {expenses.length === 0 ? (
        <EmptyState>No expenses yet. Add the first one to start tracking balances.</EmptyState>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Paid by</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date.slice(0, 10)}</td>
                  <td>
                    <Link to={`/expenses/${expense.id}`}>{expense.description}</Link>
                  </td>
                  <td>{expense.category}</td>
                  <td>
                    {expense.payers.map((p) => nameById[p.userId] ?? 'Unknown').join(', ')}
                  </td>
                  <td>{formatCents(expense.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
