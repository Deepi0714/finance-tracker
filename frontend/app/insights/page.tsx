'use client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { insightApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { Spinner, ProgressBar } from '../../components/ui/index';
import { DonutChart } from '../../components/charts/index';
import { fmt, cn } from '../../lib/utils';
import { useAuth } from '../../store/authStore';

export default function InsightsPage() {
  const { user } = useAuth();
  const cur = user?.currency ?? 'USD';

  const { data, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn:  () => insightApi.get() as any,
  });

  if (isLoading) return <AppShell title="Insights"><Spinner /></AppShell>;

  const d = data ?? {} as any;

  return (
    <AppShell title="Financial Insights">
      {/* AI messages */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-lg">
            🤖
          </div>
          <h3 className="font-semibold text-white text-sm">AI-Powered Analysis</h3>
          <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full ml-1">
            This Month
          </span>
        </div>
        <div className="space-y-2">
          {(d.insights ?? ['Loading insights…']).map((msg: string, i: number) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/4">
              <p className="text-sm text-slate-300">{msg}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Donut */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Spending by Category</h3>
          <DonutChart data={d.categoryBreakdown ?? []} />
        </div>

        {/* vs last month */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">vs. Last Month</h3>
          <div className="space-y-3">
            {(d.categoryBreakdown ?? []).slice(0, 7).map((item: any) => {
              const change = item.change ?? 0;
              const Icon   = change > 5 ? TrendingUp : change < -5 ? TrendingDown : Minus;
              const col    = change > 5 ? 'text-red-400' : change < -5 ? 'text-emerald-400' : 'text-slate-400';
              return (
                <div key={item.category?.id ?? Math.random()} className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: item.category?.color ?? '#6b7280' }}
                  />
                  <span className="text-sm text-slate-400 flex-1 truncate">
                    {item.category?.name ?? 'Other'}
                  </span>
                  <span className="text-sm text-white font-medium">
                    {fmt(item.amount, cur)}
                  </span>
                  <span className={cn('flex items-center gap-0.5 text-xs font-semibold min-w-12 justify-end', col)}>
                    <Icon className="w-3 h-3" />
                    {Math.abs(change).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Savings goals */}
      {d.savingsGoals?.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-white text-sm mb-4">Savings Goals Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {d.savingsGoals.map((g: any) => {
              const p = Math.min((g.saved_amount / g.target_amount) * 100, 100);
              return (
                <div key={g.id} className="p-4 rounded-xl bg-white/4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🎯</span>
                    <p className="text-sm font-medium text-white truncate">{g.name}</p>
                  </div>
                  <ProgressBar value={p} color={g.color ?? '#10b981'} size="sm" />
                  <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>{fmt(g.saved_amount, cur)}</span>
                    <span>{p.toFixed(0)}% of {fmt(g.target_amount, cur)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top merchants */}
      {d.topMerchants?.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">
            Top Spending Merchants This Month
          </h3>
          <div className="space-y-3">
            {d.topMerchants.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs text-slate-400 font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-white flex-1">{m.merchant}</span>
                <span className="text-sm font-semibold text-white">
                  {fmt(m._sum?.amount ?? 0, cur)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
