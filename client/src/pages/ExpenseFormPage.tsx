import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as expensesApi from '../api/expenses';
import * as groupsApi from '../api/groups';
import { HttpError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../context/AuthContext';
import { dollarsToCents, formatCents } from '../lib/money';
import {
  previewEqualSplit,
  previewPercentageSplit,
  previewSharesSplit,
} from '../lib/splitPreview';
import type {
  CreateExpensePayload,
  Expense,
  ExpenseCategory,
  GroupMember,
  SplitInputPayload,
  SplitType,
} from '../types';

const CATEGORIES: ExpenseCategory[] = [
  'FOOD',
  'RENT',
  'TRANSPORT',
  'UTILITIES',
  'ENTERTAINMENT',
  'OTHER',
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ groupId?: string; expenseId?: string }>();
  const isEdit = Boolean(params.expenseId);

  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [groupId, setGroupId] = useState<string | null>(params.groupId ?? null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [totalDollars, setTotalDollars] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');

  const [multiPayer, setMultiPayer] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState('');
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});

  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [equalIds, setEqualIds] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        let resolvedGroupId = params.groupId ?? null;

        if (params.expenseId) {
          const { expense } = await expensesApi.getExpense(params.expenseId);
          resolvedGroupId = expense.groupId;
          prefillFromExpense(expense);
        }

        if (!resolvedGroupId) throw new Error('Missing group');
        setGroupId(resolvedGroupId);

        const { group } = await groupsApi.getGroup(resolvedGroupId);
        const groupMembers = group.members ?? [];
        setMembers(groupMembers);

        if (!params.expenseId) {
          setSinglePayerId(user?.id ?? groupMembers[0]?.userId ?? '');
          setEqualIds(groupMembers.map((m) => m.userId));
        }
      } catch (err) {
        setLoadError(err instanceof HttpError ? err.message : 'Failed to load expense form');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.groupId, params.expenseId]);

  function prefillFromExpense(expense: Expense) {
    setDescription(expense.description);
    setTotalDollars((expense.totalCents / 100).toFixed(2));
    setCategory(expense.category);
    setDate(expense.date.slice(0, 10));
    setNotes(expense.notes ?? '');
    setSplitType(expense.splitType);

    if (expense.payers.length > 1) {
      setMultiPayer(true);
      setPayerAmounts(
        Object.fromEntries(expense.payers.map((p) => [p.userId, (p.amountCents / 100).toFixed(2)])),
      );
    } else {
      setSinglePayerId(expense.payers[0]?.userId ?? '');
    }

    const raw = expense.rawSplitInputs ? (JSON.parse(expense.rawSplitInputs) as SplitInputPayload) : null;
    if (raw?.splitType === 'EQUAL') setEqualIds(raw.memberIds);
    if (raw?.splitType === 'EXACT') {
      setExactAmounts(
        Object.fromEntries(Object.entries(raw.amounts).map(([id, c]) => [id, (c / 100).toFixed(2)])),
      );
    }
    if (raw?.splitType === 'PERCENTAGE') {
      setPercentages(Object.fromEntries(Object.entries(raw.percentages).map(([id, p]) => [id, String(p)])));
    }
    if (raw?.splitType === 'SHARES') {
      setShares(Object.fromEntries(Object.entries(raw.shares).map(([id, s]) => [id, String(s)])));
    }
  }

  const totalCents = dollarsToCents(totalDollars || '0');

  const payerSumCents = multiPayer
    ? Object.values(payerAmounts).reduce((sum, v) => sum + dollarsToCents(v || '0'), 0)
    : totalCents;

  const splitPreview = useMemo((): Record<string, number> => {
    if (!members) return {};
    if (splitType === 'EQUAL') return previewEqualSplit(totalCents, equalIds);
    if (splitType === 'EXACT') {
      return Object.fromEntries(
        Object.entries(exactAmounts)
          .filter(([, v]) => v !== '')
          .map(([id, v]) => [id, dollarsToCents(v)]),
      );
    }
    if (splitType === 'PERCENTAGE') {
      const pct = Object.fromEntries(
        Object.entries(percentages)
          .filter(([, v]) => v !== '')
          .map(([id, v]) => [id, Number(v)]),
      );
      return previewPercentageSplit(totalCents, pct);
    }
    const shareWeights = Object.fromEntries(
      Object.entries(shares)
        .filter(([, v]) => v !== '')
        .map(([id, v]) => [id, Number(v)]),
    );
    return previewSharesSplit(totalCents, shareWeights);
  }, [members, splitType, equalIds, exactAmounts, percentages, shares, totalCents]);

  const splitSumCents = Object.values(splitPreview).reduce((s, v) => s + v, 0);
  const nameById = Object.fromEntries((members ?? []).map((m) => [m.userId, m.user.name]));

  function toggleEqualMember(userId: string) {
    setEqualIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function buildSplitPayload(): SplitInputPayload {
    if (splitType === 'EQUAL') return { splitType: 'EQUAL', memberIds: equalIds };
    if (splitType === 'EXACT') {
      return {
        splitType: 'EXACT',
        amounts: Object.fromEntries(
          Object.entries(exactAmounts)
            .filter(([, v]) => v !== '')
            .map(([id, v]) => [id, dollarsToCents(v)]),
        ),
      };
    }
    if (splitType === 'PERCENTAGE') {
      return {
        splitType: 'PERCENTAGE',
        percentages: Object.fromEntries(
          Object.entries(percentages)
            .filter(([, v]) => v !== '')
            .map(([id, v]) => [id, Number(v)]),
        ),
      };
    }
    return {
      splitType: 'SHARES',
      shares: Object.fromEntries(
        Object.entries(shares)
          .filter(([, v]) => v !== '')
          .map(([id, v]) => [id, Number(v)]),
      ),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    setSubmitError(null);
    setSubmitting(true);

    const payload: CreateExpensePayload = {
      description,
      totalCents,
      category,
      date,
      notes: notes || undefined,
      payers: multiPayer
        ? Object.entries(payerAmounts)
            .filter(([, v]) => v !== '')
            .map(([userId, v]) => ({ userId, amountCents: dollarsToCents(v) }))
        : [{ userId: singlePayerId, amountCents: totalCents }],
      split: buildSplitPayload(),
    };

    try {
      if (isEdit && params.expenseId) {
        await expensesApi.updateExpense(params.expenseId, payload);
        navigate(`/expenses/${params.expenseId}`);
      } else {
        const res = await expensesApi.createExpense(groupId, payload);
        navigate(`/expenses/${res.expense.id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof HttpError ? err.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Loading..." />;
  if (loadError) return <ErrorBanner message={loadError} />;
  if (!members || !groupId) return null;

  return (
    <div>
      <h1>{isEdit ? 'Edit expense' : 'Add expense'}</h1>
      {submitError && <ErrorBanner message={submitError} />}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="total">Total amount</label>
              <input
                id="total"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={totalDollars}
                onChange={(e) => setTotalDollars(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="date">Date</label>
              <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Paid by</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={multiPayer}
              onChange={(e) => setMultiPayer(e.target.checked)}
            />
            Split the payment across multiple people
          </label>

          {!multiPayer ? (
            <div className="form-field" style={{ maxWidth: 260 }}>
              <label htmlFor="payer">Payer</label>
              <select id="payer" value={singlePayerId} onChange={(e) => setSinglePayerId(e.target.value)}>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              {members.map((m) => (
                <div key={m.userId} className="form-row" style={{ alignItems: 'flex-end' }}>
                  <div className="form-field" style={{ flex: '0 0 160px' }}>
                    <label>{m.user.name}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={payerAmounts[m.userId] ?? ''}
                      onChange={(e) =>
                        setPayerAmounts((prev) => ({ ...prev, [m.userId]: e.target.value }))
                      }
                    />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: '0.85rem', color: payerSumCents === totalCents ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                Payers total {formatCents(payerSumCents)} of {formatCents(totalCents)}
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Split</h3>
          <div className="form-field" style={{ maxWidth: 260 }}>
            <label htmlFor="split-type">Split type</label>
            <select id="split-type" value={splitType} onChange={(e) => setSplitType(e.target.value as SplitType)}>
              <option value="EQUAL">Equal</option>
              <option value="EXACT">Exact amounts</option>
              <option value="PERCENTAGE">Percentages</option>
              <option value="SHARES">Shares</option>
            </select>
          </div>

          {splitType === 'EQUAL' &&
            members.map((m) => (
              <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={equalIds.includes(m.userId)}
                  onChange={() => toggleEqualMember(m.userId)}
                />
                {m.user.name}
              </label>
            ))}

          {splitType === 'EXACT' &&
            members.map((m) => (
              <div key={m.userId} className="form-row" style={{ alignItems: 'flex-end' }}>
                <div className="form-field" style={{ flex: '0 0 160px' }}>
                  <label>{m.user.name}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={exactAmounts[m.userId] ?? ''}
                    onChange={(e) => setExactAmounts((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                  />
                </div>
              </div>
            ))}

          {splitType === 'PERCENTAGE' &&
            members.map((m) => (
              <div key={m.userId} className="form-row" style={{ alignItems: 'flex-end' }}>
                <div className="form-field" style={{ flex: '0 0 160px' }}>
                  <label>{m.user.name} (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={percentages[m.userId] ?? ''}
                    onChange={(e) => setPercentages((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                  />
                </div>
              </div>
            ))}

          {splitType === 'SHARES' &&
            members.map((m) => (
              <div key={m.userId} className="form-row" style={{ alignItems: 'flex-end' }}>
                <div className="form-field" style={{ flex: '0 0 160px' }}>
                  <label>{m.user.name} (shares)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={shares[m.userId] ?? ''}
                    onChange={(e) => setShares((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                  />
                </div>
              </div>
            ))}

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
            <strong>Live preview</strong>
            {Object.keys(splitPreview).length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>Select members to preview the split.</p>
            ) : (
              <>
                {Object.entries(splitPreview).map(([id, cents]) => (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>{nameById[id] ?? id}</span>
                    <span>{formatCents(cents)}</span>
                  </div>
                ))}
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: splitSumCents === totalCents ? 'var(--color-positive)' : 'var(--color-negative)',
                    marginTop: 6,
                  }}
                >
                  Split total {formatCents(splitSumCents)} of {formatCents(totalCents)}
                </p>
              </>
            )}
          </div>
        </div>

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add expense'}
        </button>
      </form>
    </div>
  );
}
