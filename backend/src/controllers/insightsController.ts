import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';

// ── AI Insights ──────────────────────────────────────────
export const getInsights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now      = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(),     1).toISOString();
    const curEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const prvStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prvEnd   = new Date(now.getFullYear(), now.getMonth(),     0, 23, 59, 59).toISOString();

    const [curRes, prevRes, merchantRes, goalsRes] = await Promise.all([
      supabase.from('transactions')
        .select('category_id, amount, category:categories(id,name,color)')
        .eq('user_id', req.userId!).eq('type', 'EXPENSE')
        .gte('date', curStart).lte('date', curEnd),

      supabase.from('transactions')
        .select('category_id, amount')
        .eq('user_id', req.userId!).eq('type', 'EXPENSE')
        .gte('date', prvStart).lte('date', prvEnd),

      supabase.from('transactions')
        .select('merchant, amount')
        .eq('user_id', req.userId!).eq('type', 'EXPENSE')
        .not('merchant', 'is', null)
        .gte('date', curStart).lte('date', curEnd),

      supabase.from('savings_goals')
        .select('*').eq('user_id', req.userId!).eq('status', 'ACTIVE'),
    ]);

    // Aggregate current month by category
    const curMap: Record<string, { category: any; amount: number }> = {};
    for (const t of curRes.data ?? []) {
      const key = t.category_id ?? 'other';
      if (!curMap[key]) curMap[key] = { category: (t as any).category, amount: 0 };
      curMap[key].amount += t.amount;
    }

    // Aggregate prev month
    const prevMap: Record<string, number> = {};
    for (const t of prevRes.data ?? []) {
      const key = t.category_id ?? 'other';
      prevMap[key] = (prevMap[key] ?? 0) + t.amount;
    }

    const categoryBreakdown = Object.entries(curMap)
      .map(([key, v]) => {
        const prev   = prevMap[key] ?? 0;
        const change = prev > 0 ? ((v.amount - prev) / prev) * 100 : 0;
        return { category: v.category, amount: v.amount, previousAmount: prev, change };
      })
      .sort((a, b) => b.amount - a.amount);

    // Top merchants
    const mMap: Record<string, number> = {};
    for (const t of merchantRes.data ?? []) {
      if (t.merchant) mMap[t.merchant] = (mMap[t.merchant] ?? 0) + t.amount;
    }
    const topMerchants = Object.entries(mMap)
      .map(([merchant, amount]) => ({ merchant, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const insights = buildInsights(categoryBreakdown);

    res.json({
      categoryBreakdown,
      topMerchants,
      savingsGoals: goalsRes.data ?? [],
      insights,
    });
  } catch (err) { next(err); }
};

// ── Monthly Report ───────────────────────────────────────
export const getMonthlyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now   = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();

    const start = new Date(year, month - 1, 1).toISOString();
    const end   = new Date(year, month,     0, 23, 59, 59).toISOString();

    const [txnRes, budgetRes] = await Promise.all([
      supabase.from('transactions')
        .select('*, category:categories(id,name,color)')
        .eq('user_id', req.userId!)
        .gte('date', start).lte('date', end)
        .order('date', { ascending: true }),

      supabase.from('budgets')
        .select('*, category:categories(id,name,color)')
        .eq('user_id', req.userId!)
        .eq('month', month).eq('year', year),
    ]);

    const txns       = txnRes.data ?? [];
    const totalIncome   = txns.filter(t => t.type === 'INCOME').reduce((s,t) => s + t.amount, 0);
    const totalExpenses = txns.filter(t => t.type === 'EXPENSE').reduce((s,t) => s + t.amount, 0);

    res.json({
      month, year,
      summary: {
        totalIncome,
        totalExpenses,
        netSavings:       totalIncome - totalExpenses,
        savingsRate:      totalIncome > 0
          ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
        transactionCount: txns.length,
      },
      transactions: txns,
      budgets:      budgetRes.data ?? [],
    });
  } catch (err) { next(err); }
};

// ── Insight message generator ────────────────────────────
function buildInsights(
  breakdown: Array<{ category: any; amount: number; previousAmount: number; change: number }>
): string[] {
  const msgs: string[] = [];
  const totalCur  = breakdown.reduce((s, c) => s + c.amount,         0);
  const totalPrev = breakdown.reduce((s, c) => s + c.previousAmount, 0);

  if (totalPrev > 0 && totalCur > totalPrev * 1.1) {
    msgs.push(`⚠️ Total spending is up ${Math.round(((totalCur-totalPrev)/totalPrev)*100)}% vs last month.`);
  } else if (totalPrev > 0 && totalCur < totalPrev * 0.9) {
    msgs.push(`🎉 Great job! Spending is down ${Math.round(((totalPrev-totalCur)/totalPrev)*100)}% vs last month.`);
  }

  for (const c of breakdown.slice(0, 5)) {
    if (c.previousAmount > 0 && c.change > 25)
      msgs.push(`📈 ${c.category?.name ?? 'Unknown'} spending is up ${Math.round(c.change)}% this month.`);
    if (c.previousAmount > 0 && c.change < -25)
      msgs.push(`📉 ${c.category?.name ?? 'Unknown'} spending dropped ${Math.round(Math.abs(c.change))}% — nice!`);
  }

  if (!msgs.length)
    msgs.push('✅ Spending is on track compared to last month. Keep it up!');

  msgs.push('💡 Tip: Automating savings on payday helps reach goals 2× faster.');
  msgs.push('📊 Review your top 3 spending categories to find quick savings wins.');
  return msgs;
}
