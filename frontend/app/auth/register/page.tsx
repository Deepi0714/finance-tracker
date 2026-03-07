'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { TrendingUp, Loader2 } from 'lucide-react';
import { authApi } from '../../../lib/api';
import { useAuth } from '../../../store/authStore';

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 chars'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  currency: z.string().default('USD'),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { currency: 'USD' } });

  const onSubmit = async (data: Form) => {
    try {
      const res: any = await authApi.register(data);
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success('Account created — welcome! 🎉');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-cyan-500/8    rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[400px]">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <p className="font-bold text-white">FinanceTracker</p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
          <p className="text-sm text-slate-400 mb-6">Start tracking your finances for free</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {(
              [
                { name: 'name',     label: 'Full Name', type: 'text',     ph: 'Jane Smith'       },
                { name: 'email',    label: 'Email',     type: 'email',    ph: 'jane@example.com' },
                { name: 'password', label: 'Password',  type: 'password', ph: '••••••••'         },
              ] as const
            ).map(f => (
              <div key={f.name}>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">{f.label}</label>
                <input
                  {...register(f.name)}
                  type={f.type}
                  placeholder={f.ph}
                  className="field"
                />
                {errors[f.name] && (
                  <p className="text-red-400 text-xs mt-1">{errors[f.name]?.message}</p>
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Currency</label>
              <select {...register('currency')} className="field">
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="INR">INR — Indian Rupee</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
