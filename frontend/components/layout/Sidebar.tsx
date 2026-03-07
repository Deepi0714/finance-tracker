'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ArrowUpDown, Target, Repeat,
  BarChart3, FileText, PiggyBank, TrendingUp, LogOut, User,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/authStore';
import { authApi } from '../../lib/api';
import { toast } from 'sonner';

const NAV = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/transactions',  icon: ArrowUpDown,     label: 'Transactions'   },
  { href: '/budgets',       icon: Target,          label: 'Budgets'        },
  { href: '/subscriptions', icon: Repeat,          label: 'Subscriptions'  },
  { href: '/savings',       icon: PiggyBank,       label: 'Savings Goals'  },
  { href: '/insights',      icon: BarChart3,       label: 'Insights'       },
  { href: '/reports',       icon: FileText,        label: 'Reports'        },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { user, clear, refreshToken } = useAuth();

  const logout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      clear();
      router.push('/auth/login');
      toast.success('Logged out');
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-60 flex flex-col glass border-r border-white/5 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white text-sm">FinanceTracker</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/5 pt-3">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="truncate">
            <p className="text-white text-xs font-medium leading-tight truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
