'use client';
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fmt } from '../../lib/utils';

// ── Shared tooltip ─────────────────────────────────────────
const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-xl">
      {label && <p className="text-slate-400 mb-2">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300 capitalize">{p.name}:</span>
          <span className="text-white font-semibold">
            {typeof p.value === 'number' ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Income vs Expense Area Chart ──────────────────────────
interface TrendData { month: string; income: number; expenses: number }

export function TrendChart({ data }: { data: TrendData[] }) {
  const formatted = data.map(d => ({
    ...d,
    month: new Date(d.month).toLocaleString('default', {
      month: 'short',
      year:  '2-digit',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4ade80" stopOpacity={0}   />
          </linearGradient>
          <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f87171" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f87171" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<TT />} />
        <Area type="monotone" dataKey="income"   name="Income"   stroke="#4ade80" fill="url(#gIncome)"  strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" fill="url(#gExpense)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Category Donut Chart ──────────────────────────────────
interface CatItem { category: { name: string; color: string } | null; amount: number }

export function DonutChart({ data }: { data: CatItem[] }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No spending data yet
      </div>
    );
  }

  const total  = data.reduce((s, d) => s + d.amount, 0);
  const slices = data.map(d => ({
    name:  d.category?.name  ?? 'Other',
    value: d.amount,
    color: d.category?.color ?? '#6b7280',
    pct:   total > 0 ? (d.amount / total) * 100 : 0,
  }));

  const DTT = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="glass rounded-xl p-3 text-xs shadow-xl">
        <p className="text-white font-semibold">{p.name}</p>
        <p className="text-slate-300">{fmt(p.value)}</p>
        <p className="text-slate-500">{p.payload.pct.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={slices}
          cx="50%" cy="50%"
          innerRadius={55} outerRadius={82}
          paddingAngle={2}
          dataKey="value"
        >
          {slices.map((s, i) => (
            <Cell key={i} fill={s.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<DTT />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={v => <span className="text-slate-400 text-xs">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
