import 'chart.js/auto';
import { Bar } from 'react-chartjs-2';
import type { CategoryMonthSpending } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#4f46e5',
  RENT: '#0891b2',
  TRANSPORT: '#d97706',
  UTILITIES: '#059669',
  ENTERTAINMENT: '#db2777',
  OTHER: '#64748b',
};

export function CategorySpendingChart({ data }: { data: CategoryMonthSpending[] }) {
  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  const categories = Array.from(new Set(data.map((d) => d.category))).sort();

  const datasets = categories.map((category) => ({
    label: category,
    backgroundColor: CATEGORY_COLORS[category] ?? '#94a3b8',
    data: months.map((month) => {
      const match = data.find((d) => d.month === month && d.category === category);
      return match ? match.totalCents / 100 : 0;
    }),
  }));

  return (
    <Bar
      data={{ labels: months, datasets }}
      options={{
        responsive: true,
        scales: { x: { stacked: true }, y: { stacked: true } },
        plugins: { legend: { position: 'bottom' } },
      }}
    />
  );
}
