// ── StatCard ──────────────────────────────────────────────
import { cn } from '../../lib/utils';

interface StatCardProps {
  title:    string;
  value:    string;
  subtitle?: string;
  icon:     React.ReactNode;
  trend?:   { value: number };
  accent?:  'green' | 'red' | 'cyan' | 'purple' | 'default';
}

const ACCENTS = {
  green:   'border-emerald-500/20 bg-emerald-500/5',
  red:     'border-red-500/20     bg-red-500/5',
  cyan:    'border-cyan-500/20    bg-cyan-500/5',
  purple:  'border-purple-500/20  bg-purple-500/5',
  default: 'border-white/8',
};

export function StatCard({
  title, value, subtitle, icon, trend, accent = 'default',
}: StatCardProps) {
  return (
    <div className={cn('glass rounded-2xl p-5', ACCENTS[accent])}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.value >= 0
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            )}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
import { X } from 'lucide-react';

interface ModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  title:    string;
  children: React.ReactNode;
  size?:    'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn('relative w-full glass rounded-2xl p-6 shadow-2xl', SIZES[size])}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────
interface EmptyProps {
  icon:        string;
  title:       string;
  description: string;
  action?:     React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────
interface ProgressProps { value: number; color?: string; size?: 'sm' | 'md' }

export function ProgressBar({ value, color = '#10b981', size = 'md' }: ProgressProps) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className={cn('w-full bg-white/10 rounded-full overflow-hidden', h)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', h)}
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}
