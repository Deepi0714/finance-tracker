export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  avatar_url?: string | null;
  monthly_income_goal?: number | null;
  monthly_savings_goal?: number | null;
  timezone: string;
  created_at: string;
}

export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_system: boolean;
  user_id?: string | null;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Transaction {
  id: string;
  user_id: string;
  category_id?: string | null;
  category?: Category | null;
  type: TransactionType;
  amount: number;
  description: string;
  notes?: string | null;
  date: string;
  merchant?: string | null;
  tags: string[];
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category: Category;
  amount: number;
  spent: number;
  month: number;
  year: number;
  alert_at: number;
  created_at: string;
}

export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'TRIAL';

export interface Subscription {
  id: string;
  user_id: string;
  category_id?: string | null;
  category?: Category | null;
  name: string;
  amount: number;
  billing_cycle: Frequency;
  next_billing_date: string;
  start_date: string;
  website?: string | null;
  status: SubscriptionStatus;
  notes?: string | null;
  reminder_days: number;
  created_at: string;
}

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date?: string | null;
  icon: string;
  color: string;
  status: GoalStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface DashboardStats {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  recentTransactions: Transaction[];
  categoryBreakdown: Array<{ category: Category | null; amount: number }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SubscriptionsResponse {
  subscriptions: Subscription[];
  totalMonthly: number;
  totalYearly: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}
