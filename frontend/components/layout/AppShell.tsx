'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../store/authStore';
import { notifApi } from '../../lib/api';
import { NotificationsResponse } from '../../types';

interface Props {
  title:    string;
  children: React.ReactNode;
}

export function AppShell({ title, children }: Props) {
  const router       = useRouter();
  const { isAuthed } = useAuth();

  useEffect(() => {
    if (!isAuthed()) router.replace('/auth/login');
  }, []);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn:  () => notifApi.list() as any,
    staleTime: 60_000,
    enabled:  isAuthed(),
  });

  const unread = data?.unreadCount ?? 0;

  if (!isAuthed()) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 border-b border-white/5 bg-[#09090b]/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-6">
          <h1 className="text-base font-semibold text-white">{title}</h1>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-white/5 transition text-slate-400 hover:text-white">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
