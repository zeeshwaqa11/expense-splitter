import 'dotenv/config';
import { createApp } from './app.js';
import { scheduleRecurringExpensesJob } from './jobs/recurringExpenses.job.js';

const port = Number(process.env.PORT ?? 5000);
const app = createApp();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

scheduleRecurringExpensesJob();
