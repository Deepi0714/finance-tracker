'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { insightApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { Spinner } from '../../components/ui/index';
import { fmt, getMonthName, cn } from '../../lib/utils';
import { useAuth } from '../../store/authStore';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: getMonthName(i + 1),
}));

export default function ReportsPage() {
  const { user } = useAuth();
  const cur = user?.currency ?? 'USD';
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['report', month, year],
    queryFn:  () => insightApi.report({ month, year }) as any,
  });

  const exportCSV = () => {
    if (!data?.transactions?.length) return;
    const header = 'Date,Description,Type,Amount,Category,Merchant\n';
    const rows   = data.transactions
      .map((t: any) =>
        [
          t.date.slice(0, 10),
          `"${t.description.replace(/"/g, '""')}"`,
          t.type,
          t.amount.toFixed(2),
          t.category?.name ?? '',
          t.merchant ?? '',
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `finance-report-${year}-${String(month).padStart(2,'0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Reports">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="field w-auto"
        >
          {MONTHS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="field w-auto"
        >
          {[2023, 2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={exportCSV}
          disabled={!data?.transactions?.length}
          className="ml-auto flex items-center gap-2 glass border border-white/10 hover:border-emerald-500/40 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-xl transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data ? null : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total Income',   value: fmt(data.summary.totalIncome,   cur), col: 'text-emerald-400' },
              { label: 'Total Expenses', value: fmt(data.summary.totalExpenses, cur), col: 'text-red-400'     },
              { label: 'Net Savings',    value: fmt(data.summary.netSavings,    cur), col: 'text-cyan-400'    },
              { label: 'Savings Rate',   value: `${data.summary.savingsRate.toFixed(1)}%`, col: 'text-purple-400' },
            ].map(({ label, value, col }) => (
              <div key={label} className="glass rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className={cn('text-xl font-bold', col)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Budget vs Actual bar chart */}
          {data.budgets?.length > 0 && (
            <div className="glass rounded-2xl p-5 mb-5">
              <h3 className="font-semibold text-white text-sm mb-4">Budget vs Actual Spending</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={data.budgets}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="category.name"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(v: any) => fmt(v, cur)}
                  />
                  <Bar dataKey="amount" name="Budget" fill="rgba(99,102,241,0.4)" radius={[4,4,0,0]} />
                  <Bar dataKey="spent"  name="Actual"  fill="rgba(248,113,113,0.4)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Transactions table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">
                All Transactions — {getMonthName(month)} {year}
              </h3>
              <span className="text-xs text-slate-400">
                {data.summary.transactionCount} transactions
              </span>
            </div>
            {data.transactions?.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-12">
                No transactions in this period
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Date','Description','Category','Type','Amount'].map(h => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-white/3 transition">
                        <td className="px-4 py-2.5 text-xs text-slate-400">
                          {t.date.slice(0, 10)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-white">{t.description}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">
                          {t.category?.name ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={
                              t.type === 'INCOME' ? 'badge-income' : 'badge-expense'
                            }
                          >
                            {t.type}
                          </span>
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2.5 text-sm font-semibold',
                            t.type === 'INCOME' ? 'income' : 'expense'
                          )}
                        >
                          {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount, cur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
