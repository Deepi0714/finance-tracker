import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const TransactionSchema = z.object({
  type:        z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount:      z.coerce.number().positive(),
  description: z.string().min(1).max(255),
  date:        z.string().min(1),
  category_id: z.string().uuid().optional().nullable(),
  notes:       z.string().max(500).optional().nullable(),
  merchant:    z.string().max(100).optional().nullable(),
  tags:        z.array(z.string()).optional().default([]),
});

// ── List with filters + pagination ───────────────────────
export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', type, category_id, search, start_date, end_date } =
      req.query as Record<string, string>;

    const from = (Number(page) - 1) * Number(limit);
    const to   = from + Number(limit) - 1;

    let query = supabase
      .from('transactions')
      .select('*, category:categories(id,name,icon,color,type)', { count: 'exact' })
      .eq('user_id', req.userId!)
      .order('date', { ascending: false })
      .range(from, to);

    if (type)        query = query.eq('type', type);
    if (category_id) query = query.eq('category_id', category_id);
    if (search)      query = query.ilike('description', `%${search}%`);
    if (start_date)  query = query.gte('date', start_date);
    if (end_date)    query = query.lte('date', end_date);

    const { data, error, count } = await query;
    if (error) throw createError(error.message, 500);

    res.json({
      transactions: data,
      total:        count ?? 0,
      page:         Number(page),
      totalPages:   Math.ceil((count ?? 0) / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── Dashboard stats ──────────────────────────────────────
export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Parallel queries
    const [incomeRes, expenseRes, transferRes, recentRes, catRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', req.userId!)
        .eq('type', 'INCOME')
        .gte('date', start)
        .lte('date', end),

      supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', req.userId!)
        .eq('type', 'EXPENSE')
        .gte('date', start)
        .lte('date', end),

      supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', req.userId!)
        .eq('type', 'TRANSFER')
        .gte('date', start)
        .lte('date', end),

      supabase
        .from('transactions')
        .select('*, category:categories(id,name,icon,color)')
        .eq('user_id', req.userId!)
        .order('date', { ascending: false })
        .limit(10),

      supabase
        .from('transactions')
        .select('category_id, amount, category:categories(id,name,color)')
        .eq('user_id', req.userId!)
        .eq('type', 'EXPENSE')
        .gte('date', start)
        .lte('date', end),
    ]);

  
const monthlyIncome    = (incomeRes.data    ?? []).reduce((s, t) => s + t.amount, 0);
const monthlyExpenses  = (expenseRes.data   ?? []).reduce((s, t) => s + t.amount, 0);
const monthlyTransfers = (transferRes.data  ?? []).reduce((s, t) => s + t.amount, 0);

    // Aggregate category breakdown
    const catMap: Record<string, { category: any; amount: number }> = {};
    for (const t of catRes.data ?? []) {
      const key = t.category_id ?? 'other';
      if (!catMap[key]) catMap[key] = { category: t.category, amount: 0 };
      catMap[key].amount += t.amount;
    }
    const categoryBreakdown = Object.values(catMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // 6-month trend — use RPC if available, otherwise group in-memory
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: trendData } = await supabase
      .from('transactions')
      .select('date, amount, type')
      .eq('user_id', req.userId!)
      .gte('date', sixMonthsAgo.toISOString())
      .in('type', ['INCOME', 'EXPENSE']);

    const trendMap: Record<string, { month: string; income: number; expenses: number }> = {};
    for (const t of trendData ?? []) {
      const key = t.date.slice(0, 7); // YYYY-MM
      if (!trendMap[key]) trendMap[key] = { month: key + '-01', income: 0, expenses: 0 };
      if (t.type === 'INCOME')  trendMap[key].income   += t.amount;
      if (t.type === 'EXPENSE') trendMap[key].expenses += t.amount;
    }
    const monthlyTrend = Object.values(trendMap).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

  
    res.json({
      monthlyIncome,
      monthlyExpenses,
      monthlyTransfers,
      monthlySavings: monthlyIncome - monthlyExpenses,
      savingsRate: monthlyIncome > 0
        ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
        : 0,
      recentTransactions: recentRes.data ?? [],
      categoryBreakdown,
      monthlyTrend,
    });
  } catch (err) { next(err); }
};

// ── Create ───────────────────────────────────────────────
export const createTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = TransactionSchema.parse(req.body);

    const { data: txn, error } = await supabase
      .from('transactions')
      .insert({ ...data, user_id: req.userId! })
      .select('*, category:categories(id,name,icon,color)')
      .single();

    if (error) throw createError(error.message, 500);

    // Sync budget spent
    if (txn.type === 'EXPENSE' && txn.category_id) {
      const d = new Date(txn.date);
      const { data: budget } = await supabase
        .from('budgets')
        .select('id, spent')
        .eq('user_id', req.userId!)
        .eq('category_id', txn.category_id)
        .eq('month', d.getMonth() + 1)
        .eq('year', d.getFullYear())
        .single();

      if (budget) {
        await supabase
          .from('budgets')
          .update({ spent: budget.spent + txn.amount })
          .eq('id', budget.id);
      }
    }

    res.status(201).json(txn);
  } catch (err) { next(err); }
};

// ── Update ───────────────────────────────────────────────
export const updateTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!existing) throw createError('Transaction not found', 404);

    const data = TransactionSchema.partial().parse(req.body);

    const { data: txn, error } = await supabase
      .from('transactions')
      .update(data)
      .eq('id', req.params.id)
      .select('*, category:categories(id,name,icon,color)')
      .single();

    if (error) throw createError(error.message, 500);
    res.json(txn);
  } catch (err) { next(err); }
};

// ── Delete ───────────────────────────────────────────────
export const deleteTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!existing) throw createError('Transaction not found', 404);

    await supabase.from('transactions').delete().eq('id', req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
};
