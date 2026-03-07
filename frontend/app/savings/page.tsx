'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { savingsApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { Modal, EmptyState, Spinner, ProgressBar } from '../../components/ui/index';
import { fmt, fmtDate, pct } from '../../lib/utils';
import { SavingsGoal } from '../../types';
import { useAuth } from '../../store/authStore';

const schema = z.object({
  name:          z.string().min(1, 'Name required'),
  target_amount: z.coerce.number().positive(),
  saved_amount:  z.coerce.number().min(0).optional().default(0),
  target_date:   z.string().optional(),
  color:         z.string().optional().default('#10b981'),
});
type Form = z.infer<typeof schema>;

export default function SavingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open,    setOpen]    = useState(false);
  const [deposit, setDeposit] = useState<{ goal: SavingsGoal; amount: string } | null>(null);

  const { data: goals = [], isLoading } = useQuery<SavingsGoal[]>({
    queryKey: ['savings'],
    queryFn:  () => savingsApi.list() as any,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#10b981', saved_amount: 0 },
  });

  const createMut = useMutation({
    mutationFn: (d: Form) => savingsApi.create({
      ...d,
      target_date: d.target_date ? new Date(d.target_date).toISOString() : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings'] });
      toast.success('Goal created! 🎯');
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Failed to create'),
  });

  const depositMut = useMutation({
    mutationFn: ({ id, newAmount }: { id: string; newAmount: number }) =>
      savingsApi.update(id, { saved_amount: newAmount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings'] });
      toast.success('Deposit recorded 🎉');
      setDeposit(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => savingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings'] });
      toast.success('Goal deleted');
    },
  });

  const totalSaved  = goals.reduce((s, g) => s + (g.saved_amount  ?? 0), 0);
  const totalTarget = goals.reduce((s, g) => s + (g.target_amount ?? 0), 0);

  return (
    <AppShell title="Savings Goals">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Saved',     value: fmt(totalSaved,  user?.currency) },
          { label: 'Total Target',    value: fmt(totalTarget, user?.currency) },
          { label: 'Overall Progress',value: `${pct(totalSaved, totalTarget)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : goals.length === 0 ? (
        <EmptyState
          icon="🐷"
          title="No savings goals yet"
          description="Set financial goals and track your progress month by month"
          action={
            <button
              onClick={() => setOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm px-4 py-2 rounded-xl transition"
            >
              Create First Goal
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g: any) => {
            const p         = pct(g.saved_amount, g.target_amount);
            const remaining = g.target_amount - g.saved_amount;
            const done      = p >= 100;

            return (
              <div key={g.id} className="glass rounded-2xl p-5 relative group">
                <button
                  onClick={() => deleteMut.mutate(g.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: (g.color ?? '#10b981') + '22' }}
                  >
                    🎯
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{g.name}</p>
                    {g.target_date && (
                      <p className="text-xs text-slate-500">Due {fmtDate(g.target_date)}</p>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>{p}% saved</span>
                    <span>{fmt(remaining, user?.currency)} to go</span>
                  </div>
                  <ProgressBar value={p} color={g.color ?? '#10b981'} />
                </div>

                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Saved</p>
                    <p className="text-xl font-bold text-white">
                      {fmt(g.saved_amount, user?.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Target</p>
                    <p className="text-white font-bold">
                      {fmt(g.target_amount, user?.currency)}
                    </p>
                  </div>
                </div>

                {done ? (
                  <div className="w-full py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-semibold text-center">
                    🎉 Goal Achieved!
                  </div>
                ) : (
                  <button
                    onClick={() => setDeposit({ goal: g, amount: '' })}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition border border-white/10"
                  >
                    + Add Deposit
                  </button>                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="New Savings Goal">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Goal Name *</label>
            <input {...register('name')} placeholder="e.g. Emergency Fund" className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Target Amount *</label>
              <input {...register('target_amount')} type="number" step="0.01" placeholder="10000" className="field" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Already Saved</label>
              <input {...register('saved_amount')} type="number" step="0.01" placeholder="0" className="field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Target Date</label>
              <input {...register('target_date')} type="date" className="field" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Colour</label>
              <input {...register('color')} type="color" className="field h-10 p-1 cursor-pointer" />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {isSubmitting ? 'Creating…' : 'Create Goal'}
          </button>
        </form>
      </Modal>

      {/* Deposit modal */}
      {deposit && (
        <Modal
          isOpen
          onClose={() => setDeposit(null)}
          title={`Add to "${deposit.goal.name}"`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Deposit Amount</label>
              <input
                type="number"
                step="0.01"
                value={deposit.amount}
                onChange={e => setDeposit({ ...deposit, amount: e.target.value })}
                placeholder="100.00"
                className="field"
                autoFocus
              />
            </div>
            <button
              onClick={() =>
                depositMut.mutate({
                  id:        deposit.goal.id,
                  newAmount: deposit.goal.saved_amount + Number(deposit.amount),
                })
              }
              disabled={!deposit.amount || Number(deposit.amount) <= 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
            >
              Record Deposit
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
