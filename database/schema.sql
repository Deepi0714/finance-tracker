-- ================================================================
-- FinanceTracker — Supabase Schema
-- Run this in: Supabase → SQL Editor → New Query → Run
-- ================================================================

-- ── Extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  name                  TEXT NOT NULL,
  avatar_url            TEXT,
  currency              TEXT DEFAULT 'USD',
  monthly_income_goal   FLOAT,
  monthly_savings_goal  FLOAT,
  timezone              TEXT DEFAULT 'UTC',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Refresh tokens ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token      TEXT UNIQUE NOT NULL,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  icon       TEXT DEFAULT 'circle',
  color      TEXT DEFAULT '#6366f1',
  type       TEXT DEFAULT 'EXPENSE' CHECK (type IN ('INCOME','EXPENSE','BOTH')),
  is_system  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transactions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE','TRANSFER')),
  amount       FLOAT NOT NULL CHECK (amount > 0),
  description  TEXT NOT NULL,
  notes        TEXT,
  date         TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  merchant     TEXT,
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_category  ON transactions(user_id, category_id);

-- ── Budgets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount      FLOAT NOT NULL CHECK (amount > 0),
  spent       FLOAT DEFAULT 0,
  month       INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        INT NOT NULL,
  alert_at    FLOAT DEFAULT 80,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id, month, year)
);

-- ── Subscriptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  amount            FLOAT NOT NULL CHECK (amount > 0),
  billing_cycle     TEXT NOT NULL CHECK (billing_cycle IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY')),
  next_billing_date TIMESTAMPTZ NOT NULL,
  start_date        TIMESTAMPTZ NOT NULL,
  end_date          TIMESTAMPTZ,
  website           TEXT,
  logo_url          TEXT,
  status            TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','CANCELLED','TRIAL')),
  notes             TEXT,
  reminder_days     INT DEFAULT 3,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Savings Goals ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  target_amount FLOAT NOT NULL CHECK (target_amount > 0),
  saved_amount  FLOAT DEFAULT 0,
  target_date   TIMESTAMPTZ,
  icon          TEXT DEFAULT 'target',
  color         TEXT DEFAULT '#10b981',
  status        TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','PAUSED','CANCELLED')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
    'BILL_REMINDER','SUBSCRIPTION_RENEWAL','BUDGET_WARNING',
    'BUDGET_EXCEEDED','SAVINGS_MILESTONE','WEEKLY_SUMMARY',
    'MONTHLY_REPORT','UNUSUAL_SPENDING'
  )),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

-- ── Auto updated_at trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_upd        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transactions_upd BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_budgets_upd      BEFORE UPDATE ON budgets      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subs_upd         BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_goals_upd        BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed system categories ────────────────────────────────
INSERT INTO categories (name, icon, color, type, is_system) VALUES
  ('Salary',        'briefcase',       '#10b981', 'INCOME',  TRUE),
  ('Freelance',     'laptop',          '#06b6d4', 'INCOME',  TRUE),
  ('Investment',    'trending-up',     '#8b5cf6', 'BOTH',    TRUE),
  ('Food & Dining', 'utensils',        '#f59e0b', 'EXPENSE', TRUE),
  ('Transport',     'car',             '#3b82f6', 'EXPENSE', TRUE),
  ('Rent',          'home',            '#ef4444', 'EXPENSE', TRUE),
  ('Shopping',      'shopping-bag',    '#ec4899', 'EXPENSE', TRUE),
  ('Bills',         'zap',             '#f97316', 'EXPENSE', TRUE),
  ('Health',        'heart',           '#14b8a6', 'EXPENSE', TRUE),
  ('Entertainment', 'film',            '#a855f7', 'EXPENSE', TRUE),
  ('Subscriptions', 'repeat',          '#6366f1', 'EXPENSE', TRUE),
  ('Education',     'book',            '#0ea5e9', 'EXPENSE', TRUE),
  ('Travel',        'plane',           '#84cc16', 'EXPENSE', TRUE),
  ('Insurance',     'shield',          '#64748b', 'EXPENSE', TRUE),
  ('Savings',       'piggy-bank',      '#10b981', 'EXPENSE', TRUE),
  ('Other',         'more-horizontal', '#94a3b8', 'BOTH',    TRUE)
ON CONFLICT DO NOTHING;

-- ── Row Level Security (optional — our API uses service role) ──
-- Uncomment if you want to use Supabase client directly from frontend too
--
-- ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "own_data" ON transactions  FOR ALL USING (user_id = auth.uid());
-- CREATE POLICY "own_data" ON budgets       FOR ALL USING (user_id = auth.uid());
-- CREATE POLICY "own_data" ON subscriptions FOR ALL USING (user_id = auth.uid());
-- CREATE POLICY "own_data" ON savings_goals FOR ALL USING (user_id = auth.uid());
-- CREATE POLICY "own_data" ON notifications FOR ALL USING (user_id = auth.uid());
-- CREATE POLICY "cat_read" ON categories    FOR SELECT USING (user_id = auth.uid() OR is_system = TRUE);
