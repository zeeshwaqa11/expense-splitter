import { useEffect, useState } from 'react';
import * as insightsApi from '../../api/insights';
import { HttpError } from '../../api/client';
import { CategorySpendingChart } from '../../charts/CategorySpendingChart';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingState } from '../../components/LoadingState';
import { formatCents } from '../../lib/money';
import type { GroupInsights } from '../../types';

export function InsightsTab({ groupId, currency }: { groupId: string; currency: string }) {
  const [insights, setInsights] = useState<GroupInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    insightsApi
      .getInsights(groupId)
      .then(setInsights)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Failed to load insights'));
  }, [groupId]);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await insightsApi.getExportCsv(groupId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ledger.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!insights) return <LoadingState label="Loading insights..." />;

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Insights</h2>
        <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export ledger CSV'}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Spending by category, per month</h3>
        {insights.spendingByCategory.length === 0 ? (
          <EmptyState>No expenses yet.</EmptyState>
        ) : (
          <CategorySpendingChart data={insights.spendingByCategory} />
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Paid vs. share per member</h3>
        {insights.memberInsights.length === 0 ? (
          <EmptyState>No members yet.</EmptyState>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Total paid</th>
                <th>Total share</th>
              </tr>
            </thead>
            <tbody>
              {insights.memberInsights.map((m) => (
                <tr key={m.userId}>
                  <td>{m.name}</td>
                  <td>{formatCents(m.totalPaidCents, currency)}</td>
                  <td>{formatCents(m.totalShareCents, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
