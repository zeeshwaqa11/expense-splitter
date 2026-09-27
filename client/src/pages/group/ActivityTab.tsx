import { useEffect, useState } from 'react';
import * as activityApi from '../../api/activity';
import { HttpError } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingState } from '../../components/LoadingState';
import type { ActivityEntry } from '../../types';

function describe(entry: ActivityEntry): string {
  const label = entry.type.replace(/_/g, ' ').toLowerCase();
  const description = (entry.payload.description as string | undefined) ?? '';
  return description ? `${label}: ${description}` : label;
}

export function ActivityTab({ groupId }: { groupId: string }) {
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    activityApi
      .listActivity(groupId)
      .then((res) => setActivity(res.activity))
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Failed to load activity'));
  }, [groupId]);

  if (error) return <ErrorBanner message={error} />;
  if (activity === null) return <LoadingState label="Loading activity..." />;
  if (activity.length === 0) return <EmptyState>No activity yet.</EmptyState>;

  return (
    <div className="card">
      {activity.map((entry) => (
        <div
          key={entry.id}
          style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}
        >
          <strong>{entry.actorName}</strong>{' '}
          <span style={{ color: 'var(--color-text-muted)' }}>{describe(entry)}</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {new Date(entry.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
