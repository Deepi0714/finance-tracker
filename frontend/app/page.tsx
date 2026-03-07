'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../store/authStore';

export default function RootPage() {
  const router   = useRouter();
  const { isAuthed } = useAuth();

  useEffect(() => {
    router.replace(isAuthed() ? '/dashboard' : '/auth/login');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
