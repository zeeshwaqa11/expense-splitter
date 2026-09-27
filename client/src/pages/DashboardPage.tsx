import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as groupsApi from '../api/groups';
import * as meApi from '../api/me';
import { HttpError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { formatCents } from '../lib/money';
import type { GroupType, MySummary } from '../types';

const GROUP_TYPES: GroupType[] = ['HOME', 'TRIP', 'COUPLE', 'OTHER'];

export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<MySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('HOME');
  const [currency, setCurrency] = useState('USD');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    meApi
      .getMySummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await groupsApi.createGroup({ name, type, currency });
      navigate(`/groups/${res.group.id}`);
    } catch (err) {
      setCreateError(err instanceof HttpError ? err.message : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!summary) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : 'New group'}
        </button>
      </div>

      <div className="card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Overall balance</p>
        <p
          style={{ fontSize: '1.8rem', margin: '4px 0 0' }}
          className={summary.overallNetCents >= 0 ? 'money-positive' : 'money-negative'}
        >
          {summary.overallNetCents >= 0 ? 'You are owed ' : 'You owe '}
          {formatCents(Math.abs(summary.overallNetCents))}
        </p>
      </div>

      {showCreate && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Create a group</h2>
          {createError && <ErrorBanner message={createError} />}
          <form onSubmit={handleCreateGroup}>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="group-name">Name</label>
                <input
                  id="group-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="group-type">Type</label>
                <select
                  id="group-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as GroupType)}
                >
                  {GROUP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="group-currency">Currency</label>
                <input
                  id="group-currency"
                  required
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create group'}
            </button>
          </form>
        </div>
      )}

      <h2 style={{ marginTop: 28 }}>Your groups</h2>
      {summary.groups.length === 0 ? (
        <EmptyState>You are not in any groups yet. Create one to get started.</EmptyState>
      ) : (
        <div className="group-grid">
          {summary.groups.map((g) => (
            <Link key={g.groupId} to={`/groups/${g.groupId}`} className="group-card card">
              <strong>{g.groupName}</strong>
              <p
                className={g.netCents >= 0 ? 'money-positive' : 'money-negative'}
                style={{ margin: '8px 0 0' }}
              >
                {g.netCents === 0
                  ? 'Settled up'
                  : g.netCents > 0
                    ? `You are owed ${formatCents(g.netCents)}`
                    : `You owe ${formatCents(Math.abs(g.netCents))}`}
              </p>
            </Link>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 28 }}>Recent activity</h2>
      {summary.recentActivity.length === 0 ? (
        <EmptyState>No activity yet.</EmptyState>
      ) : (
        <div className="card">
          {summary.recentActivity.map((a) => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 600 }}>{a.actorName}</span>{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>
                {a.type.replace(/_/g, ' ').toLowerCase()} in {a.groupName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
