'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user:         User | null;
  accessToken:  string | null;
  refreshToken: string | null;
  setAuth:  (user: User, at: string, rt: string) => void;
  setUser:  (user: User) => void;
  clear:    () => void;
  isAuthed: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken',  accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
      },

      setUser: user => set({ user }),

      clear: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      },

      isAuthed: () => !!get().user && !!get().accessToken,
    }),
    {
      name:        'ft-auth',
      partialize: s => ({
        user:         s.user,
        accessToken:  s.accessToken,
        refreshToken: s.refreshToken,
      }),
    }
  )
);
