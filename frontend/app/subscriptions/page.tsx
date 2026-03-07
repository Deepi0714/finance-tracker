'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Pause, Play, ExternalLink } from 'lucide-react';
import { subApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { Modal, EmptyState, Spinner } from '../../components/ui/index';
import { fmt, fmtDate, daysUntil, cn } from '../../lib/utils';
import { Subscription, SubscriptionsResponse } from '../../types';
import { useAuth } from '../../store/authStore';

const schema = z.object({
  name:              z.string().min(1, 'Name is required'),
  amount:            z.coerce.number().positive('Must be > 0'),
  billing_cycle:     z.enum(['DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY']),
  next_billing_date: z.string().min(1, 'Required'),
  start_date:        z.string().min(1, 'Required'),
  website:           z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes:             z.string().optional(),
  reminder_days:     z.coerce.number().int().min(0).max(30).optional().default(3),
});
type Form = z.infer<typeof schema>;

const QUICK = [
  { name: 'Netflix',      emoji: '🎬' },
  { name: 'Spotify',      emoji: '🎵' },
  { name: 'Amazon Prime', emoji: '📦' },
  { name: 'Disney+',      emoji: '🏰' },
  { name: 'YouTube',      emoji: '▶️' },
  { name: 'iCloud',       emoji: '☁️' },
  { name: 'Gym',          emoji: '💪' },
  { name: 'Custom',       emoji: '➕' },
];

const NEXT_MONTH = () =>
  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toISOString().slice(0, 10);

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<SubscriptionsResponse>({
    queryKey: ['subscriptions'],
    queryFn:  () => subApi.list() as any,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<Form>({
      resolver: zodResolver(schema),
      defaultValues: {
        billing_cycle:     'MONTHLY',
        next_billing_date: NEXT_MONTH(),
        start_date:        new Date().toISOString().slice(0, 10),
        reminder_days:     3,
      },
    });

  const createMut = useMutation({
    mutationFn: (d: Form) => subApi.create({
      ...d,
      website:           d.website || null,
      next_billing_date: new Date(d.next_billing_date).toISOString(),
      start_date:        new Date(d.start_date).toISOString(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription added!');
      setOpen(false);
      reset();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? 'Failed to add'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      subApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Updated');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => subApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Deleted');
    },
  });

  const subs  = data?.subscriptions ?? [];
  const total = data?.totalMonthly  ?? 0;

  return (
    <AppShell title="Subscriptions">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Active',       value: subs.filter(s => s.status === 'ACTIVE').length, isCurrency: false },
          { label: 'Monthly Cost', value: total,      isCurrency: true },
          { label: 'Annual Cost',  value: total * 12, isCurrency: true },
        ].map(({ label, value, isCurrency }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">
              {isCurrency ? fmt(value as number, user?.currency) : value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : subs.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="No subscriptions tracked"
          description="Track all recurring subscriptions and get renewal reminders"
          action={
            <button
              onClick={() => setOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm px-4 py-2 rounded-xl transition"
            >
              Add First Subscription
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.map((s: Subscription) => {
            const days   = daysUntil(s.next_billing_date);
            const urgent = days <= (s.reminder_days ?? 3) && s.status === 'ACTIVE';
            return (
              <div
                key={s.id}
                className={cn(
                  'glass rounded-2xl p-5 relative group transition',
                  urgent && 'border border-yellow-500/30'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                      🔄
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{s.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {(s.billing_cycle ?? '').toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                    s.status === 'ACTIVE'  ? 'bg-emerald-500/20 text-emerald-400' :
                    s.status === 'PAUSED'  ? 'bg-yellow-500/20  text-yellow-400'  :
                    s.status === 'TRIAL'   ? 'bg-blue-500/20    text-blue-400'    :
                                             'bg-slate-500/20   text-slate-400'
                  )}>
                    {s.status}
                  </span>
                </div>

                <p className="text-2xl font-bold text-white mb-1">
                  {fmt(s.amount, user?.currency)}
                </p>
                <p className={cn('text-xs mb-4', urgent ? 'text-yellow-400' : 'text-slate-500')}>
                  {urgent
                    ? `⚡ Due in ${days} day${days !== 1 ? 's' : ''}`
                    : `Next: ${fmtDate(s.next_billing_date)}`}
                </p>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {s.website && (
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() =>
                      toggleMut.mutate({
                        id:     s.id,
                        status: s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                      })
                    }
                    className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-slate-500 hover:text-yellow-400 transition"
                  >
                    {s.status === 'ACTIVE'
                      ? <Pause className="w-3.5 h-3.5" />
                      : <Play  className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteMut.mutate(s.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal isOpen={open} onClose={() => { setOpen(false); reset(); }} title="Add Subscription">
        {/* Quick select */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUICK.map(q => (
            <button
              key={q.name}
              type="button"
              onClick={() => q.name !== 'Custom' && setValue('name', q.name)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-center"
            >
              <span className="text-xl">{q.emoji}</span>
              <span className="text-xs text-slate-400 leading-none">{q.name}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Name *</label>
              <input {...register('name')} placeholder="Netflix" className="field" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Amount *</label>
              <input {...register('amount')} type="number" step="0.01" placeholder="9.99" className="field" />
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Billing Cycle</label>
              <select {...register('billing_cycle')} className="field">
                {['MONTHLY','YEARLY','QUARTERLY','WEEKLY','BIWEEKLY','DAILY'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Remind (days before)</label>
              <input {...register('reminder_days')} type="number" min={0} max={30} className="field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Next Billing</label>
              <input {...register('next_billing_date')} type="date" className="field" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Start Date</label>
              <input {...register('start_date')} type="date" className="field" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Website (optional)</label>
            <input {...register('website')} type="url" placeholder="https://netflix.com" className="field" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || createMut.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {isSubmitting || createMut.isPending ? 'Adding…' : 'Add Subscription'}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
