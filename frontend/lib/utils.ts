import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function fmtDateShort(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export function getMonthName(m: number) {
  return new Date(2024, m - 1).toLocaleString('default', { month: 'long' });
}

export function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.min(Math.round((value / total) * 100), 100);
}

export function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
