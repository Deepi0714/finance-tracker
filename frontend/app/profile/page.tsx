'use client';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { authApi } from '../../lib/api';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../store/authStore';

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name:              user?.name              ?? '',
      currency:          user?.currency          ?? 'USD',
      monthly_income_goal: user?.monthly_income_goal ?? '',
      monthly_savings_goal:user?.monthly_savings_goal ?? '',
      timezone:          user?.timezone          ?? 'UTC',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const updated = await authApi.updateProfile(data) as any;
      setUser(updated);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  return (
    <AppShell title="Profile">
      <div className="max-w-lg">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-3xl font-bold text-emerald-400">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white text-lg">{user?.name}</p>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Full Name</label>
              <input {...register('name')} className="field" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Currency</label>
              <select {...register('currency')} className="field">
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="INR">INR — Indian Rupee</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Monthly Income Goal</label>
                <input {...register('monthly_income_goal')} type="number" step="0.01" className="field" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Monthly Savings Goal</label>
                <input {...register('monthly_savings_goal')} type="number" step="0.01" className="field" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Timezone</label>
              <input {...register('timezone')} className="field" placeholder="UTC" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
