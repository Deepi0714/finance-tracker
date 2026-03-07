'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { txApi, catApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { Modal, EmptyState, Spinner } from '../../components/ui/index';
import { fmt, fmtDate, cn } from '../../lib/utils';
import { Transaction, Category, TransactionsResponse } from '../../types';
import { useAuth } from '../../store/authStore';

const schema = z.object({
  type:        z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount:      z.coerce.number().positive('Must be > 0'),
  description: z.string().min(1, 'Required'),
  date:        z.string().min(1),
  category_id: z.string().optional(),
  notes:       z.string().optional(),
  merchant:    z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function TransactionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const cur = user?.currency ?? 'USD';

  const [open,     setOpen]     = useState(false);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [typeF,    setTypeF]    = useState('');

  const { data, isLoading } = useQuery<TransactionsResponse>({
    queryKey: ['transactions', page, search, typeF],
    queryFn:  () => txApi.list({ page, limit: 15, search: search || undefined, type: typeF || undefined }) as any,
  });

  const { data: cats = [], isError: catsError } = useQuery<Category[]>({
  queryKey: ['categories'],
  queryFn:  () => catApi.list() as any,
  staleTime: 60_000,
});

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'EXPENSE',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const txnType = watch('type');

  const createMut = useMutation({
   mutationFn: (d: Form) =>
  txApi.create({
    ...d,
    date:        new Date(d.date).toISOString(),
    category_id: d.category_id || null,   // ← empty string → null
    merchant:    d.merchant    || null,
    notes:       d.notes       || null,
  }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction added!');
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Failed to add transaction'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => txApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const txns       = data?.transactions ?? [];
  const totalPages = data?.totalPages   ?? 1;
  const total      = data?.total        ?? 0;

  const filteredCats = cats.filter(c =>
  txnType === 'INCOME'
    ? c.type === 'INCOME' || c.type === 'BOTH'
    : txnType === 'EXPENSE'
      ? c.type === 'EXPENSE' || c.type === 'BOTH'
      : true   // TRANSFER — show all categories
);

  return (
    <AppShell title="Transactions">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search transactions…"
              className="field pl-9"
            />
          </div>
          <select
            value={typeF}
            onChange={e => { setTypeF(e.target.value); setPage(1); }}
            className="field w-auto"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>
        <button
          onClick={() => { reset({ type: 'EXPENSE', date: new Date().toISOString().slice(0, 10) }); setOpen(true); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Showing',       value: total,                                                      fmt: false },
          { label: 'Total Income',  value: txns.filter(t => t.type === 'INCOME') .reduce((s,t)=>s+t.amount,0), fmt: true, col: 'text-emerald-400' },
          { label: 'Total Expenses',value: txns.filter(t => t.type === 'EXPENSE').reduce((s,t)=>s+t.amount,0), fmt: true, col: 'text-red-400'     },
        ].map(({ label, value, fmt: f, col }) => (
          <div key={label} className="glass rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">{label}</p>
            <p className={cn('font-bold text-white text-lg', col ?? '')}>
              {f ? fmt(value as number, cur) : value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : txns.length === 0 ? (
          <EmptyState
            icon="💸"
            title="No transactions yet"
            description="Track every income and expense to understand your finances"
            action={
              <button
                onClick={() => setOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm px-4 py-2 rounded-xl transition"
              >
                Add First Transaction
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Date', 'Description', 'Category', 'Type', 'Amount', ''].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {txns.map((t: Transaction) => (
                    <tr key={t.id} className="hover:bg-white/3 transition group">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {fmtDate(t.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white font-medium">{t.description}</p>
                        {t.merchant && (
                          <p className="text-xs text-slate-500">{t.merchant}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.category && (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: t.category.color + '22',
                              color:      t.category.color,
                            }}
                          >
                            {t.category.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}>
                          {t.type}
                        </span>
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-sm font-semibold',
                        t.type === 'INCOME' ? 'income' : 'expense'
                      )}>
                        {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount, cur)}
                      </td>
                      <td className="px-4 py-3 w-10">
                        <button
                          onClick={() => deleteMut.mutate(t.id)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <p className="text-xs text-slate-400">
                  Page {page} of {totalPages} · {total} total
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 disabled:opacity-30 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Transaction">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          {/* Type tabs */}
          <div className="grid grid-cols-3 gap-2">
            {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setValue('type', t)}
                className={cn(
                  'py-2 rounded-xl text-xs font-semibold transition',
                  txnType === t
                    ? t === 'INCOME'
                      ? 'bg-emerald-500 text-white'
                      : t === 'EXPENSE'
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Amount *</label>
              <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="field" />
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date *</label>
              <input {...register('date')} type="date" className="field" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Description *</label>
            <input {...register('description')} placeholder="e.g. Grocery shopping" className="field" />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Category</label>
              <select {...register('category_id')} className="field">
                <option value="">Select…</option>
                {filteredCats.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Merchant</label>
              <input {...register('merchant')} placeholder="Store / company" className="field" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Optional notes…" className="field resize-none" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {isSubmitting ? 'Saving…' : 'Add Transaction'}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
