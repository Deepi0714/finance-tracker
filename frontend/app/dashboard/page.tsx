'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, PiggyBank, Percent,
  ArrowUpRight, ArrowDownRight, Plus,
} from 'lucide-react';
import { txApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { StatCard, Spinner } from '../../components/ui/index';
import { TrendChart, DonutChart } from '../../components/charts/index';
import { fmt, fmtDateShort, greeting, cn } from '../../lib/utils';
import { useAuth } from '../../store/authStore';
import { DashboardStats, Transaction } from '../../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn:  () => txApi.dashboard() as any,
  });

  if (isLoading) return <AppShell title="Dashboard"><Spinner /></AppShell>;

  const s = stats!;
  const cur = user?.currency ?? 'USD';

  return (
    <AppShell title="Dashboard">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">
          {greeting()},{' '}
          <span className="grad-text">{user?.name?.split(' ')[0]}</span> 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Monthly Income"
          value={fmt(s.monthlyIncome, cur)}
          icon={<TrendingUp  className="w-5 h-5 text-emerald-400" />}
          accent="green"
        />
        <StatCard
          title="Monthly Expenses"
          value={fmt(s.monthlyExpenses, cur)}
          icon={<TrendingDown className="w-5 h-5 text-red-400" />}
          accent="red"
        />
        <StatCard 
            title="Transfers" 
            value={fmt((s as any).monthlyTransfers ?? 0, cur)} 
            icon="↔️"
            accent="red"
          />
        <StatCard
          title="Net Savings"
          value={fmt(s.monthlySavings, cur)}
          subtitle="This month"
          icon={<PiggyBank className="w-5 h-5 text-cyan-400" />}
          accent="cyan"
        />
        <StatCard
          title="Savings Rate"
          value={`${s.savingsRate.toFixed(1)}%`}
          subtitle="of income saved"
          icon={<Percent className="w-5 h-5 text-purple-400" />}
          accent="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Trend */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Income vs Expenses — Last 6 months</h3>
            <div className="flex gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Expenses
              </span>
            </div>
          </div>
          {s.monthlyTrend?.length > 0 ? (
            <TrendChart data={s.monthlyTrend as any} />
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              Add transactions to see the trend chart
            </div>
          )}
        </div>

        {/* Donut */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">
            Spending by Category
          </h3>
          <DonutChart data={s.categoryBreakdown} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent transactions */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Recent Transactions</h3>
            <Link href="/transactions" className="text-xs text-emerald-400 hover:text-emerald-300 transition">
              View all →
            </Link>
          </div>

          {!s.recentTransactions?.length ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No transactions yet.{' '}
              <Link href="/transactions" className="text-emerald-400">Add one</Link>.
            </p>
          ) : (
            <div className="space-y-1">
              {s.recentTransactions.slice(0, 8).map((t: Transaction) => (
                <div key={t.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: (t.category?.color ?? '#6b7280') + '20' }}
                  >
                    {t.type === 'INCOME' ? '💰' : '💸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{t.description}</p>
                    <p className="text-xs text-slate-500">
                      {t.category?.name ?? '—'} · {fmtDateShort(t.date)}
                    </p>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold shrink-0',
                    t.type === 'INCOME' ? 'income' : 'expense'
                  )}>
                    {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount, cur)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + savings rate */}
        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { href: '/transactions', label: 'Add Income',      Icon: ArrowUpRight,   bg: 'hover:bg-emerald-500/10', col: 'text-emerald-400' },
                { href: '/transactions', label: 'Add Expense',     Icon: ArrowDownRight, bg: 'hover:bg-red-500/10',     col: 'text-red-400'     },
                { href: '/budgets',      label: 'Set Budget',      Icon: TrendingUp,     bg: 'hover:bg-purple-500/10',  col: 'text-purple-400'  },
                { href: '/subscriptions',label: 'Add Subscription',Icon: Plus,           bg: 'hover:bg-cyan-500/10',    col: 'text-cyan-400'    },
                { href: '/savings',      label: 'New Goal',        Icon: PiggyBank,      bg: 'hover:bg-yellow-500/10',  col: 'text-yellow-400'  },
              ].map(({ href, label, Icon, bg, col }) => (
                <Link key={label} href={href}
                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition', bg)}
                >
                  <Icon className={cn('w-4 h-4', col)} />
                  <span className="text-white">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Savings rate gauge */}
          <div className="glass rounded-2xl p-5">
            <p className="text-xs text-slate-400 mb-1">Monthly Savings Rate</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-bold text-white">
                {s.savingsRate.toFixed(0)}%
              </span>
              <span className="text-xs text-slate-500 mb-1">Target: 20%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
                style={{ width: `${Math.min(s.savingsRate, 100)}%` }}
              />
            </div>
            <p className={cn(
              'text-xs mt-2',
              s.savingsRate >= 20 ? 'text-emerald-400' : 'text-slate-500'
            )}>
              {s.savingsRate >= 20
                ? '🎉 Above target — great work!'
                : `${(20 - s.savingsRate).toFixed(1)}% below target`}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
