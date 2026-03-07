'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { budgetApi, catApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { Modal, EmptyState, Spinner, ProgressBar } from '../../components/ui/index';
import { fmt, pct, cn } from '../../lib/utils';
import { Budget, Category } from '../../types';
import { useAuth } from '../../store/authStore';

const schema = z.object({
  category_id: z.string().min(1, 'Pick a category'),
  amount:      z.coerce.number().positive('Must be > 0'),
  month:       z.coerce.number().int().min(1).max(12),
  year:        z.coerce.number().int(),
  alert_at:    z.coerce.number().min(1).max(100).optional().default(80),
});
type Form = z.infer<typeof schema>;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function BudgetsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const now = new Date();
  const [selM, setSelM] = useState(now.getMonth() + 1);
  const [selY, setSelY] = useState(now.getFullYear());
  const [open, setOpen] = useState(false);

  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ['budgets', selM, selY],
    queryFn:  () => budgetApi.list({ month: selM, year: selY }) as any,
  });

  const { data: cats = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn:  () => catApi.list() as any,
  });

  const expCats = cats.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { month: selM, year: selY, alert_at: 80 },
  });

  const upsertMut = useMutation({
    mutationFn: (d: Form) => budgetApi.upsert(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget saved!');
      setOpen(false);
      reset({ month: selM, year: selY, alert_at: 80, category_id: '', amount: 0 });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? 'Failed to save budget'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => budgetApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget deleted');
    },
  });

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent  = budgets.reduce((s, b) => s + b.spent,  0);
  const overallPct  = pct(totalSpent, totalBudget);

  return (
    <AppShell title="Budgets">
      {/* Month picker */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 glass rounded-xl p-1">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelM(i + 1)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                selM === i + 1 ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <select
          value={selY}
          onChange={e => setSelY(Number(e.target.value))}
          className="field w-auto"
        >
          {[2023, 2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={() => {
            reset({ month: selM, year: selY, alert_at: 80 });
            setOpen(true);
          }}
          className="ml-auto flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus className="w-4 h-4" /> Set Budget
        </button>
      </div>

      {/* Overall progress */}
      {budgets.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white text-sm">Overall Budget</h3>
            <span className={cn(
              'text-sm font-semibold',
              overallPct >= 100 ? 'text-red-400' : overallPct >= 80 ? 'text-yellow-400' : 'text-emerald-400'
            )}>
              {overallPct}% used
            </span>
          </div>
          <ProgressBar
            value={overallPct}
            color={overallPct >= 100 ? '#f87171' : overallPct >= 80 ? '#facc15' : '#10b981'}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Spent: {fmt(totalSpent, user?.currency)}</span>
            <span>Budget: {fmt(totalBudget, user?.currency)}</span>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {isLoading ? (
        <Spinner />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No budgets set"
          description="Set monthly spending limits by category and get alerts when you're close"
          action={
            <button
              onClick={() => setOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm px-4 py-2 rounded-xl transition"
            >
              Set First Budget
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b: Budget) => {
            const p       = pct(b.spent, b.amount);
            const over    = p >= 100;
            const warning = !over && p >= b.alert_at;
            const barCol  = over ? '#f87171' : warning ? '#facc15' : '#10b981';
            const textCol = over ? 'text-red-400' : warning ? 'text-yellow-400' : 'text-emerald-400';

            return (
              <div key={b.id} className="glass rounded-2xl p-5 relative group">
                <button
                  onClick={() => deleteMut.mutate(b.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: (b.category?.color ?? '#6366f1') + '22' }}
                  >
                    💰
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.category?.name ?? '—'}</p>
                    <p className={cn('text-xs font-medium', textCol)}>{p}% used</p>
                  </div>
                </div>

                <ProgressBar value={p} color={barCol} />

                <div className="flex justify-between items-end mt-3">
                  <div>
                    <p className="text-xs text-slate-500">Spent</p>
                    <p className={cn('text-xl font-bold', textCol)}>{fmt(b.spent, user?.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Budget</p>
                    <p className="text-white font-bold">{fmt(b.amount, user?.currency)}</p>
                  </div>
                </div>

                {(over || warning) && (
                  <div className={cn(
                    'mt-3 text-xs px-3 py-1.5 rounded-lg',
                    over ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
                  )}>
                    {over
                      ? `⚠️ Over by ${fmt(b.spent - b.amount, user?.currency)}`
                      : `⚡ Only ${fmt(b.amount - b.spent, user?.currency)} left`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Set Monthly Budget">
        <form onSubmit={handleSubmit(d => upsertMut.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Category *</label>
            <select {...register('category_id')} className="field">
              <option value="">Select category…</option>
              {expCats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-red-400 text-xs mt-1">{errors.category_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Budget Amount *</label>
              <input {...register('amount')} type="number" step="0.01" placeholder="500" className="field" />
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Alert at (%)</label>
              <input {...register('alert_at')} type="number" min={1} max={100} className="field" />
            </div>
          </div>

          <input type="hidden" {...register('month')} value={selM} />
          <input type="hidden" {...register('year')}  value={selY} />

          <button
            type="submit"
            disabled={isSubmitting || upsertMut.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {isSubmitting || upsertMut.isPending ? 'Saving…' : 'Save Budget'}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
