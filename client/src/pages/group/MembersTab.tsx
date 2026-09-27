import { useState, type FormEvent } from 'react';
import * as groupsApi from '../../api/groups';
import { HttpError } from '../../api/client';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import type { GroupMember } from '../../types';

export function MembersTab({
  groupId,
  members,
  onChanged,
}: {
  groupId: string;
  members: GroupMember[];
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await groupsApi.addMember(groupId, { email });
      setEmail('');
      onChanged();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    setRemovingId(userId);
    try {
      await groupsApi.removeMember(groupId, userId);
      onChanged();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      {error && <ErrorBanner message={error} />}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Members</h3>
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span>
              {m.user.name} <span style={{ color: 'var(--color-text-muted)' }}>{m.user.email}</span>
            </span>
            {m.userId !== user?.id && (
              <button
                className="btn btn-danger btn-sm"
                disabled={removingId === m.userId}
                onClick={() => handleRemove(m.userId)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add a member by email</h3>
        <form onSubmit={handleAdd} className="form-row">
          <div className="form-field">
            <label htmlFor="member-email">Email</label>
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={submitting} style={{ height: 42 }}>
            {submitting ? 'Adding...' : 'Add member'}
          </button>
        </form>
      </div>
    </div>
  );
}
