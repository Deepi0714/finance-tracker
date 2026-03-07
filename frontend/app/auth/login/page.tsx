'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '../../../lib/api';
import { useAuth } from '../../../store/authStore';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router    = useRouter();
  const { setAuth } = useAuth();
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      const res: any = await authApi.login(data);
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success(`Welcome back, ${res.user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-cyan-500/8    rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[400px]">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white leading-none">FinanceTracker</p>
              <p className="text-xs text-slate-500">Smart personal finance</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="field"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          {/* Demo box */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs font-semibold text-emerald-400 mb-1">🚀 Demo account</p>
            <p className="text-xs text-slate-400">Email: <span className="text-white">demo@financetracker.io</span></p>
            <p className="text-xs text-slate-400">Password: <span className="text-white">demo1234</span></p>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            No account?{' '}
            <Link href="/auth/register" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
