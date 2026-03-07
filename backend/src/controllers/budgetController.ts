import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const BudgetSchema = z.object({
  category_id: z.string().uuid(),
  amount:      z.coerce.number().positive(),
  month:       z.coerce.number().int().min(1).max(12),
  year:        z.coerce.number().int().min(2020),
  alert_at:    z.coerce.number().min(0).max(100).optional().default(80),
});

export const getBudgets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now   = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();

    const { data, error } = await supabase
      .from('budgets')
      .select('*, category:categories(id,name,icon,color)')
      .eq('user_id', req.userId!)
      .eq('month', month)
      .eq('year', year)
      .order('category(name)');

    if (error) throw createError(error.message, 500);
    res.json(data);
  } catch (err) { next(err); }
};

export const upsertBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = BudgetSchema.parse(req.body);

    // Calculate actual spend for the period
    const startOfMonth = new Date(data.year, data.month - 1, 1).toISOString();
    const endOfMonth   = new Date(data.year, data.month,     0, 23, 59, 59).toISOString();

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', req.userId!)
      .eq('category_id', data.category_id)
      .eq('type', 'EXPENSE')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    const spent = (txns ?? []).reduce((s, t) => s + t.amount, 0);

    // Check if budget exists
    const { data: existing } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', req.userId!)
      .eq('category_id', data.category_id)
      .eq('month', data.month)
      .eq('year', data.year)
      .single();

    let budget: any;
    if (existing) {
      const { data: updated, error } = await supabase
        .from('budgets')
        .update({ amount: data.amount, alert_at: data.alert_at, spent })
        .eq('id', existing.id)
        .select('*, category:categories(id,name,icon,color)')
        .single();
      if (error) throw createError(error.message, 500);
      budget = updated;
    } else {
      const { data: created, error } = await supabase
        .from('budgets')
        .insert({ ...data, user_id: req.userId!, spent })
        .select('*, category:categories(id,name,icon,color)')
        .single();
      if (error) throw createError(error.message, 500);
      budget = created;
    }

    res.json(budget);
  } catch (err) { next(err); }
};

export const deleteBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: existing } = await supabase
      .from('budgets')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!existing) throw createError('Budget not found', 404);

    await supabase.from('budgets').delete().eq('id', req.params.id);
    res.json({ message: 'Budget deleted' });
  } catch (err) { next(err); }
};
