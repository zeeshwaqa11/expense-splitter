import { useEffect, useState } from 'react';
import * as balancesApi from '../../api/balances';
import { HttpError } from '../../api/client';
import * as settlementsApi from '../../api/settlements';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingState } from '../../components/LoadingState';
import { dollarsToCents, formatCents } from '../../lib/money';
import type { GroupBalances, GroupMember, Payment } from '../../types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BalancesTab({
  groupId,
  members,
  currency,
}: {
  groupId: string;
  members: GroupMember[];
  currency: string;
}) {
  const [data, setData] = useState<GroupBalances | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simplify, setSimplify] = useState(true);
  const [settleTarget, setSettleTarget] = useState<Payment | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(todayIso());
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, simplify]);

  function load() {
    setError(null);
    balancesApi
      .getBalances(groupId, simplify)
      .then(setData)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Failed to load balances'));
  }

  function openSettle(payment: Payment) {
    setSettleTarget(payment);
    setSettleAmount((payment.amountCents / 100).toFixed(2));
    setSettleDate(todayIso());
    setSettleError(null);
  }

  async function submitSettle() {
    if (!settleTarget) return;
    setSettling(true);
    setSettleError(null);
    try {
      await settlementsApi.createSettlement(groupId, {
        fromUserId: settleTarget.fromUserId,
        toUserId: settleTarget.toUserId,
        amountCents: dollarsToCents(settleAmount),
        date: settleDate,
      });
      setSettleTarget(null);
      load();
    } catch (err) {
      setSettleError(err instanceof HttpError ? err.message : 'Failed to record payment');
    } finally {
      setSettling(false);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState label="Loading balances..." />;
  if (members.length === 0) return <EmptyState>No members yet.</EmptyState>;

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Balances</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            checked={simplify}
            onChange={(e) => setSimplify(e.target.checked)}
          />
          Simplify debts
        </label>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Net balances</h3>
        {data.balances.map((b) => (
          <div
            key={b.userId}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}
          >
            <span>{b.name}</span>
            <span className={b.amountCents >= 0 ? 'money-positive' : 'money-negative'}>
              {b.amountCents === 0
                ? 'Settled up'
                : formatCents(b.amountCents, currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{simplify ? 'Suggested payments' : 'Who owes whom'}</h3>
        {data.payments.length === 0 ? (
          <EmptyState>Everyone is settled up.</EmptyState>
        ) : (
          data.payments.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span>
                <strong>{p.fromName}</strong> owes <strong>{p.toName}</strong>{' '}
                {formatCents(p.amountCents, currency)}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => openSettle(p)}>
                Settle up
              </button>
            </div>
          ))
        )}
      </div>

      {settleTarget && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Record payment: {settleTarget.fromName} &rarr; {settleTarget.toName}
          </h3>
          {settleError && <ErrorBanner message={settleError} />}
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="settle-amount">Amount</label>
              <input
                id="settle-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="settle-date">Date</label>
              <input
                id="settle-date"
                type="date"
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
              />
            </div>
          </div>
          <button className="btn" disabled={settling} onClick={submitSettle}>
            {settling ? 'Recording...' : 'Confirm payment'}
          </button>{' '}
          <button className="btn btn-secondary" onClick={() => setSettleTarget(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
