import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as expensesApi from '../api/expenses';
import * as groupsApi from '../api/groups';
import { HttpError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { formatCents } from '../lib/money';
import type { Expense, ExpenseRevision, GroupMember } from '../types';

export function ExpenseDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [history, setHistory] = useState<ExpenseRevision[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expenseId) return;
    load(expenseId);
  }, [expenseId]);

  async function load(id: string) {
    setError(null);
    try {
      const { expense: exp } = await expensesApi.getExpense(id);
      setExpense(exp);
      const [{ group }, { history: h }] = await Promise.all([
        groupsApi.getGroup(exp.groupId),
        expensesApi.getExpenseHistory(id),
      ]);
      setMembers(group.members ?? []);
      setHistory(h);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to load expense');
    }
  }

  async function handleDelete() {
    if (!expenseId || !expense) return;
    setBusy(true);
    try {
      await expensesApi.deleteExpense(expenseId);
      navigate(`/groups/${expense.groupId}`);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to delete expense');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!expenseId) return;
    setBusy(true);
    try {
      await expensesApi.restoreExpense(expenseId);
      load(expenseId);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to restore expense');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!expense) return <LoadingState label="Loading expense..." />;

  const nameById = Object.fromEntries(members.map((m) => [m.userId, m.user.name]));

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0 }}>{expense.description}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!expense.deletedAt && (
            <>
              <Link className="btn btn-secondary" to={`/expenses/${expense.id}/edit`}>
                Edit
              </Link>
              <button className="btn btn-danger" disabled={busy} onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
          {expense.deletedAt && (
            <button className="btn" disabled={busy} onClick={handleRestore}>
              Restore
            </button>
          )}
        </div>
      </div>

      {expense.deletedAt && <ErrorBanner message="This expense has been deleted." />}

      <div className="card">
        <p>
          <strong>{formatCents(expense.totalCents)}</strong> &middot; {expense.category} &middot;{' '}
          {expense.date.slice(0, 10)}
        </p>
        {expense.notes && <p>{expense.notes}</p>}

        <h3>Paid by</h3>
        {expense.payers.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{nameById[p.userId] ?? 'Unknown'}</span>
            <span>{formatCents(p.amountCents)}</span>
          </div>
        ))}

        <h3>Split ({expense.splitType})</h3>
        {expense.splits.map((s) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{nameById[s.userId] ?? 'Unknown'}</span>
            <span>{formatCents(s.amountCents)}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Edit history</h3>
        {history.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No edits yet.</p>
        ) : (
          history.map((h) => (
            <div key={h.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                Edited by <strong>{h.editorName}</strong> on {new Date(h.createdAt).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Previous: {String(h.snapshot.description)} &middot;{' '}
                {formatCents(Number(h.snapshot.totalCents))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
