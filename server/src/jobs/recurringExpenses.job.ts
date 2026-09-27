import cron from 'node-cron';
import { runDueRecurringExpenses } from '../modules/recurring/recurring.service.js';

export function scheduleRecurringExpensesJob(): void {
  cron.schedule('0 1 * * *', () => {
    runDueRecurringExpenses().catch((err) => {
      console.error('Recurring expenses job failed', err);
    });
  });
}
