import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as groupsApi from '../api/groups';
import { HttpError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import type { Group } from '../types';
import { ActivityTab } from './group/ActivityTab';
import { BalancesTab } from './group/BalancesTab';
import { ExpensesTab } from './group/ExpensesTab';
import { InsightsTab } from './group/InsightsTab';
import { MembersTab } from './group/MembersTab';
import { RecurringTab } from './group/RecurringTab';

type TabKey = 'expenses' | 'balances' | 'activity' | 'recurring' | 'insights' | 'members';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'expenses', label: 'Expenses' },
  { key: 'balances', label: 'Balances' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'insights', label: 'Insights' },
  { key: 'activity', label: 'Activity' },
  { key: 'members', label: 'Members' },
];

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('expenses');

  useEffect(() => {
    if (!groupId) return;
    loadGroup(groupId);
  }, [groupId]);

  function loadGroup(id: string) {
    setLoading(true);
    setError(null);
    groupsApi
      .getGroup(id)
      .then((res) => setGroup(res.group))
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Failed to load group'))
      .finally(() => setLoading(false));
  }

  if (!groupId) return null;
  if (loading) return <LoadingState label="Loading group..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!group) return null;

  const members = group.members ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{group.name}</h1>
          <span className="badge">{group.type}</span> <span className="badge">{group.currency}</span>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-button ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'expenses' && <ExpensesTab groupId={groupId} members={members} />}
      {tab === 'balances' && (
        <BalancesTab groupId={groupId} members={members} currency={group.currency} />
      )}
      {tab === 'recurring' && <RecurringTab groupId={groupId} members={members} />}
      {tab === 'insights' && <InsightsTab groupId={groupId} currency={group.currency} />}
      {tab === 'activity' && <ActivityTab groupId={groupId} />}
      {tab === 'members' && (
        <MembersTab groupId={groupId} members={members} onChanged={() => loadGroup(groupId)} />
      )}
    </div>
  );
}
