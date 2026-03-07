import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { register, login, refreshTokens, logout, getProfile, updateProfile } from '../controllers/authController';
import { getTransactions, getDashboardStats, createTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionController';
import { getBudgets, upsertBudget, deleteBudget } from '../controllers/budgetController';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../controllers/subscriptionController';
import { getInsights, getMonthlyReport } from '../controllers/insightsController';
import { supabase } from '../config/supabase';

const router = Router();

// ── Auth ──────────────────────────────────────────────────
router.post('/auth/register', register);
router.post('/auth/login',    login);
router.post('/auth/refresh',  refreshTokens);
router.post('/auth/logout',   logout);
router.get ('/auth/profile',  authenticate, getProfile);
router.put ('/auth/profile',  authenticate, updateProfile);

// ── Transactions ──────────────────────────────────────────
router.get   ('/transactions/dashboard', authenticate, getDashboardStats);
router.get   ('/transactions',           authenticate, getTransactions);
router.post  ('/transactions',           authenticate, createTransaction);
router.put   ('/transactions/:id',       authenticate, updateTransaction);
router.delete('/transactions/:id',       authenticate, deleteTransaction);

// ── Budgets ───────────────────────────────────────────────
router.get   ('/budgets',     authenticate, getBudgets);
router.post  ('/budgets',     authenticate, upsertBudget);
router.delete('/budgets/:id', authenticate, deleteBudget);

// ── Subscriptions ─────────────────────────────────────────
router.get   ('/subscriptions',     authenticate, getSubscriptions);
router.post  ('/subscriptions',     authenticate, createSubscription);
router.put   ('/subscriptions/:id', authenticate, updateSubscription);
router.delete('/subscriptions/:id', authenticate, deleteSubscription);

// ── Categories ────────────────────────────────────────────
router.get('/categories', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${req.userId},is_system.eq.true`)
      .order('is_system', { ascending: false });
    if (error) return next(error);
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/categories', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, icon = 'circle', color = '#6366f1', type = 'EXPENSE' } = req.body;
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, icon, color, type, user_id: req.userId })
      .select()
      .single();
    if (error) return next(error);
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.delete('/categories/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    await supabase.from('categories').delete().eq('id', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Insights & Reports ────────────────────────────────────
router.get('/insights',        authenticate, getInsights);
router.get('/insights/report', authenticate, getMonthlyReport);

// ── Savings Goals ─────────────────────────────────────────
router.get('/savings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });
    if (error) return next(error);
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/savings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, target_amount, saved_amount = 0, target_date, icon = 'target', color = '#10b981' } = req.body;
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        name, target_amount, saved_amount, icon, color,
        user_id: req.userId!,
        target_date: target_date || null,
      })
      .select()
      .single();
    if (error) return next(error);
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/savings/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('savings_goals').select('id')
      .eq('id', req.params.id).eq('user_id', req.userId!).single();
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    const { data, error } = await supabase
      .from('savings_goals').update(req.body).eq('id', req.params.id).select().single();
    if (error) return next(error);
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/savings/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('savings_goals').select('id')
      .eq('id', req.params.id).eq('user_id', req.userId!).single();
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    await supabase.from('savings_goals').delete().eq('id', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Notifications ─────────────────────────────────────────
router.get('/notifications', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return next(error);

    const { count: unread } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!).eq('is_read', false);

    res.json({ notifications: data, unreadCount: unread ?? 0 });
  } catch (e) { next(e); }
});

router.put('/notifications/read-all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.userId!).eq('is_read', false);
    res.json({ message: 'All marked as read' });
  } catch (e) { next(e); }
});

router.put('/notifications/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id).eq('user_id', req.userId!);
    res.json({ message: 'Marked as read' });
  } catch (e) { next(e); }
});

export default router;
