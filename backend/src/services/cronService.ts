import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export const startCronJobs = () => {

  // ── Daily 9 AM — subscription renewal reminders ─────────
  cron.schedule('0 9 * * *', async () => {
    logger.info('[CRON] Checking subscription renewals...');
    try {
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id, user_id, name, amount, next_billing_date, reminder_days')
        .eq('status', 'ACTIVE')
        .lte('next_billing_date', in7Days)
        .gte('next_billing_date', new Date().toISOString());

      let count = 0;
      for (const sub of subs ?? []) {
        const daysLeft = Math.ceil(
          (new Date(sub.next_billing_date).getTime() - Date.now()) / 86_400_000
        );
        if (daysLeft <= sub.reminder_days) {
          await supabase.from('notifications').insert({
            user_id: sub.user_id,
            type:    'SUBSCRIPTION_RENEWAL',
            title:   `${sub.name} renews in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            message: `Your ${sub.name} subscription ($${sub.amount.toFixed(2)}) is due on ${
              new Date(sub.next_billing_date).toLocaleDateString()
            }.`,
            metadata: { subscription_id: sub.id, amount: sub.amount },
          });
          count++;
        }
      }
      logger.info(`[CRON] Created ${count} subscription reminders`);
    } catch (err) {
      logger.error('[CRON] Subscription reminder error:', err);
    }
  });

  // ── Daily 6 PM — budget warnings ────────────────────────
  cron.schedule('0 18 * * *', async () => {
    logger.info('[CRON] Checking budget thresholds...');
    try {
      const now = new Date();

      const { data: budgets } = await supabase
        .from('budgets')
        .select('id, user_id, amount, spent, alert_at, category:categories(name)')
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());

      let count = 0;
      for (const b of budgets ?? []) {
        const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
        const catName = (b.category as any)?.name ?? 'Category';

        if (pct >= 100) {
          await supabase.from('notifications').insert({
            user_id: b.user_id,
            type:    'BUDGET_EXCEEDED',
            title:   `${catName} budget exceeded`,
            message: `You've gone $${(b.spent - b.amount).toFixed(2)} over your ${catName} budget.`,
            metadata: { budget_id: b.id, overspent: b.spent - b.amount },
          });
          count++;
        } else if (pct >= b.alert_at) {
          await supabase.from('notifications').insert({
            user_id: b.user_id,
            type:    'BUDGET_WARNING',
            title:   `${catName} budget at ${Math.round(pct)}%`,
            message: `You've spent $${b.spent.toFixed(2)} of your $${b.amount.toFixed(2)} ${catName} budget.`,
            metadata: { budget_id: b.id, percentage: pct },
          });
          count++;
        }
      }
      logger.info(`[CRON] Created ${count} budget notifications`);
    } catch (err) {
      logger.error('[CRON] Budget warning error:', err);
    }
  });

  // ── 1st of month 8 AM — monthly report notification ─────
  cron.schedule('0 8 1 * *', async () => {
    logger.info('[CRON] Sending monthly report notifications...');
    try {
      const now       = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const monthName = new Date(prevYear, prevMonth - 1)
        .toLocaleString('default', { month: 'long' });

      const { data: users } = await supabase.from('users').select('id');

      const notifications = (users ?? []).map(u => ({
        user_id:  u.id,
        type:     'MONTHLY_REPORT' as const,
        title:    `Your ${monthName} report is ready`,
        message:  'View your monthly financial summary in Reports.',
        metadata: { month: prevMonth, year: prevYear },
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      logger.info(`[CRON] Sent monthly reports to ${notifications.length} users`);
    } catch (err) {
      logger.error('[CRON] Monthly report error:', err);
    }
  });

  logger.info('✅ Cron jobs started (renewals · budget warnings · monthly reports)');
};
