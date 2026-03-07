import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const SubSchema = z.object({
  name:              z.string().min(1).max(100),
  amount:            z.coerce.number().positive(),
  billing_cycle:     z.enum(['DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY']),
  next_billing_date: z.string().min(1),
  start_date:        z.string().min(1),
  category_id:       z.string().uuid().optional().nullable(),
  website:           z.string().url().optional().or(z.literal('')).nullable(),
  notes:             z.string().optional().nullable(),
  reminder_days:     z.coerce.number().int().min(0).max(30).optional().default(3),
  status:            z.enum(['ACTIVE','PAUSED','CANCELLED','TRIAL']).optional().default('ACTIVE'),
});

const MONTHLY_FACTOR: Record<string, number> = {
  DAILY: 30, WEEKLY: 4.33, BIWEEKLY: 2.17,
  MONTHLY: 1, QUARTERLY: 1/3, YEARLY: 1/12,
};

export const getSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, category:categories(id,name,icon,color)')
      .eq('user_id', req.userId!)
      .order('next_billing_date', { ascending: true });

    if (error) throw createError(error.message, 500);

    const totalMonthly = (data ?? [])
      .filter(s => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + s.amount * (MONTHLY_FACTOR[s.billing_cycle] ?? 1), 0);

    res.json({ subscriptions: data, totalMonthly, totalYearly: totalMonthly * 12 });
  } catch (err) { next(err); }
};

export const createSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = SubSchema.parse(req.body);

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .insert({ ...data, user_id: req.userId!, website: data.website || null })
      .select('*, category:categories(id,name,icon,color)')
      .single();

    if (error) throw createError(error.message, 500);
    res.status(201).json(sub);
  } catch (err) { next(err); }
};

export const updateSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!existing) throw createError('Subscription not found', 404);

    const data = SubSchema.partial().parse(req.body);

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .update(data)
      .eq('id', req.params.id)
      .select('*, category:categories(id,name,icon,color)')
      .single();

    if (error) throw createError(error.message, 500);
    res.json(sub);
  } catch (err) { next(err); }
};

export const deleteSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!existing) throw createError('Subscription not found', 404);

    await supabase.from('subscriptions').delete().eq('id', req.params.id);
    res.json({ message: 'Subscription deleted' });
  } catch (err) { next(err); }
};
