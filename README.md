# 💰 FinanceTracker

Full-stack personal finance tracker — **Next.js 14 frontend** + **Node.js / Express backend** + **Supabase (PostgreSQL) database**.

---

## 📁 Project Structure

```
financetracker/
├── backend/          ← Node.js + Express + Supabase API
├── frontend/         ← Next.js 14 + TailwindCSS + Recharts
└── database/
    └── schema.sql    ← Run once in Supabase SQL Editor
```

---

## ⚡ Quick Start

### Step 1 — Supabase Database

1. Create a free project at https://supabase.com
2. Go to **SQL Editor → New Query** → paste `database/schema.sql` → click **Run**
3. Go to **Settings → API** and copy:
   - **Project URL** → used as `SUPABASE_URL`
   - **service_role** secret key → used as `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 2 — Backend

```bash
cd backend

# Install
npm install

# Configure
cp .env.example .env
# Edit .env — fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT secrets

# Seed demo data
npm run seed

# Start dev server (http://localhost:5000)
npm run dev
```

**`backend/.env`:**
```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=change-to-32-char-random-string!!
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=another-32-char-random-string!!
JWT_REFRESH_EXPIRES_IN=30d

FRONTEND_URL=http://localhost:3000
```

---

### Step 3 — Frontend

```bash
cd frontend

# Install
npm install

# Configure
cp .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL

# Start dev server (http://localhost:3000)
npm run dev
```

**`frontend/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

--

## ✨ Features

| Page | Description |
|---|---|
| 🏠 Dashboard | KPI cards, income/expense trend chart, category donut, recent transactions |
| 💸 Transactions | Add/delete income & expenses, search, filter by type/category, pagination |
| 🎯 Budgets | Monthly spending limits per category, progress bars, overspend alerts |
| 🔄 Subscriptions | Track recurring bills, pause/resume, upcoming renewal alerts |
| 🐷 Savings Goals | Set targets, record deposits, track progress with colour bars |
| 🤖 Insights | AI-generated spending analysis, month-on-month comparisons |
| 📈 Reports | Monthly summary, budget vs actual bar chart, CSV export |
| 🔔 Notifications | Auto-created by daily cron jobs |

---

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS, Recharts, Zustand, React Query, Sonner |
| Backend | Node.js, Express.js, TypeScript, Zod, Winston, node-cron |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js` |
| Auth | Custom JWT (access + refresh tokens) + bcrypt |

---

## 🌐 Deployment

**Frontend → Vercel**
```bash
cd frontend && npx vercel --prod
# Set env var: NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

**Backend → Railway or Render**
- Build: `npm install && npm run build`
- Start: `npm start`
- Add all `.env` variables in the dashboard

---

## 📡 API Endpoints (all at `/api/v1`)

```
POST  /auth/register   POST  /auth/login
POST  /auth/refresh    POST  /auth/logout
GET   /auth/profile    PUT   /auth/profile

GET   /transactions/dashboard
GET   /transactions    POST  /transactions
PUT   /transactions/:id   DELETE /transactions/:id

GET   /budgets         POST  /budgets        DELETE /budgets/:id
GET   /subscriptions   POST  /subscriptions
PUT   /subscriptions/:id  DELETE /subscriptions/:id
GET   /categories      POST  /categories     DELETE /categories/:id
GET   /insights        GET   /insights/report
GET   /savings         POST  /savings
PUT   /savings/:id     DELETE /savings/:id
GET   /notifications
PUT   /notifications/read-all
PUT   /notifications/:id/read
```

---

## 🕐 Automated Cron Jobs

| Time | Job |
|---|---|
| Daily 9:00 AM | Subscription renewal reminders |
| Daily 6:00 PM | Budget warning & exceeded alerts |
| 1st of month 8:00 AM | Monthly summary notifications |
