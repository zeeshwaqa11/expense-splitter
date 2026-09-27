import { useEffect, useState, type FormEvent } from 'react';
import * as recurringApi from '../../api/recurring';
import { HttpError } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingState } from '../../components/LoadingState';
import { useAuth } from '../../context/AuthContext';
import { dollarsToCents, formatCents } from '../../lib/money';
import type { ExpenseCategory, GroupMember, RecurrenceFrequency, RecurringExpense } from '../../types';

const CATEGORIES: ExpenseCategory[] = [
  'FOOD',
  'RENT',
  'TRANSPORT',
  'UTILITIES',
  'ENTERTAINMENT',
  'OTHER',
];

export function RecurringTab({ groupId, members }: { groupId: string; members: GroupMember[] }) {
  const { user } = useAuth();
  const [recurring, setRecurring] = useState<RecurringExpense[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('RENT');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('MONTHLY');
  const [dayOfPeriod, setDayOfPeriod] = useState(1);
  const [payerId, setPayerId] = useState(user?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  function load() {
    setError(null);
    recurringApi
      .listRecurring(groupId)
      .then((res) => setRecurring(res.recurring))
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Failed to load recurring expenses'));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const totalCents = dollarsToCents(amount);
      await recurringApi.createRecurring(groupId, {
        frequency,
        dayOfPeriod,
        template: {
          description,
          totalCents,
          category,
          payers: [{ userId: payerId, amountCents: totalCents }],
          split: { splitType: 'EQUAL', memberIds: members.map((m) => m.userId) },
        },
      });
      setShowForm(false);
      setDescription('');
      setAmount('');
      load();
    } catch (err) {
      setFormError(err instanceof HttpError ? err.message : 'Failed to create recurring expense');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(recurringId: string) {
    try {
      await recurringApi.deleteRecurring(groupId, recurringId);
      load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to delete recurring expense');
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (recurring === null) return <LoadingState label="Loading recurring expenses..." />;

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Recurring expenses</h2>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New recurring expense'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          {formError && <ErrorBanner message={formError} />}
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="rec-desc">Description</label>
                <input
                  id="rec-desc"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="rec-amount">Amount</label>
                <input
                  id="rec-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="rec-category">Category</label>
                <select
                  id="rec-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="rec-frequency">Frequency</label>
                <select
                  id="rec-frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="rec-day">
                  {frequency === 'MONTHLY' ? 'Day of month (1-31)' : 'Day of week (0=Sun)'}
                </label>
                <input
                  id="rec-day"
                  type="number"
                  min={frequency === 'MONTHLY' ? 1 : 0}
                  max={frequency === 'MONTHLY' ? 31 : 6}
                  value={dayOfPeriod}
                  onChange={(e) => setDayOfPeriod(Number(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="rec-payer">Paid by</label>
                <select id="rec-payer" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Split equally among all {members.length} group members.
            </p>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save recurring expense'}
            </button>
          </form>
        </div>
      )}

      {recurring.length === 0 ? (
        <EmptyState>No recurring expenses set up yet.</EmptyState>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Frequency</th>
                <th>Next run</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => {
                const template = JSON.parse(r.template) as { description: string; totalCents: number };
                return (
                  <tr key={r.id}>
                    <td>
                      {template.description} ({formatCents(template.totalCents)})
                    </td>
                    <td>
                      {r.frequency} (day {r.dayOfPeriod})
                    </td>
                    <td>{r.nextRunDate.slice(0, 10)}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
