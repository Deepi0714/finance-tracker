import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log('🌱 Seeding FinanceTracker...\n');

  // ── Get system categories ────────────────────────────
  const { data: cats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_system', true);

  const catMap: Record<string, string> = {};
  for (const c of cats ?? []) catMap[c.name] = c.id;

  console.log(`📁 Found ${Object.keys(catMap).length} system categories`);

  // ── Demo User ────────────────────────────────────────
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', 'demo@financetracker.io').single();

  let userId: string;
  if (existing) {
    userId = existing.id;
    console.log('👤 Demo user already exists, reusing');
  } else {
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email:                'demo@financetracker.io',
        password_hash:        passwordHash,
        name:                 'Alex Demo',
        currency:             'USD',
        monthly_income_goal:  5500,
        monthly_savings_goal: 1000,
      })
      .select('id')
      .single();
    if (error) { console.error('User creation failed:', error); process.exit(1); }
    userId = user!.id;
    console.log('👤 Created demo user');
  }

  // ── Transactions — 4 months ──────────────────────────
  console.log('💸 Creating transactions...');
  const now = new Date();
  const txns: any[] = [];

  for (let mo = 3; mo >= 0; mo--) {
    const y = now.getFullYear();
    const m = now.getMonth() - mo;

    txns.push(
      { type: 'INCOME',  amount: 4800,   description: 'Monthly Salary',          category_id: catMap['Salary'],        date: new Date(y, m, 1)  },
      { type: 'INCOME',  amount: 650,    description: 'Freelance Project',        category_id: catMap['Freelance'],     date: new Date(y, m, 15) },
      { type: 'EXPENSE', amount: 1400,   description: 'Monthly Rent',             category_id: catMap['Rent'],          date: new Date(y, m, 3)  },
      { type: 'EXPENSE', amount: 120,    description: 'Health Insurance',         category_id: catMap['Insurance'],     date: new Date(y, m, 5)  },
      { type: 'EXPENSE', amount: 95,     description: 'Electricity Bill',         category_id: catMap['Bills'],         date: new Date(y, m, 8)  },
      { type: 'EXPENSE', amount: 60,     description: 'Internet Bill',            category_id: catMap['Bills'],         date: new Date(y, m, 8)  },
      { type: 'EXPENSE', amount: 280 + Math.round(Math.random() * 80),  description: 'Groceries',    category_id: catMap['Food & Dining'],  date: new Date(y, m, 10), merchant: 'Whole Foods'   },
      { type: 'EXPENSE', amount: 90  + Math.round(Math.random() * 40),  description: 'Restaurants',  category_id: catMap['Food & Dining'],  date: new Date(y, m, 20), merchant: 'Various'       },
      { type: 'EXPENSE', amount: 80  + Math.round(Math.random() * 30),  description: 'Gas & Transit',category_id: catMap['Transport'],      date: new Date(y, m, 14), merchant: 'Shell'         },
      { type: 'EXPENSE', amount: 60  + Math.round(Math.random() * 50),  description: 'Entertainment',category_id: catMap['Entertainment'],  date: new Date(y, m, 22) },
      { type: 'EXPENSE', amount: 120 + Math.round(Math.random() * 100), description: 'Shopping',     category_id: catMap['Shopping'],       date: new Date(y, m, 18), merchant: 'Amazon'        },
      { type: 'EXPENSE', amount: 50,     description: 'Gym Membership',           category_id: catMap['Health'],        date: new Date(y, m, 2)  },
      { type: 'EXPENSE', amount: 45.96,  description: 'Streaming Services',       category_id: catMap['Subscriptions'], date: new Date(y, m, 5)  },
      { type: 'EXPENSE', amount: 500,    description: 'Monthly Savings Transfer', category_id: catMap['Savings'],       date: new Date(y, m, 2)  },
    );
  }

  const { error: txnErr } = await supabase
    .from('transactions')
    .insert(txns.map(t => ({
      ...t,
      user_id: userId,
      date: t.date.toISOString(),
    })));

  if (txnErr) console.error('Transactions error:', txnErr);
  else console.log(`   ✅ ${txns.length} transactions`);

  // ── Subscriptions ────────────────────────────────────
  console.log('🔄 Creating subscriptions...');
  const subs = [
    { name: 'Netflix',        amount: 15.99, website: 'https://netflix.com'    },
    { name: 'Spotify',        amount: 9.99,  website: 'https://spotify.com'    },
    { name: 'Amazon Prime',   amount: 14.99, website: 'https://amazon.com'     },
    { name: 'iCloud Storage', amount: 2.99,  website: 'https://icloud.com'     },
    { name: 'Gym Membership', amount: 50.00, website: null                     },
    { name: 'GitHub',         amount: 4.00,  website: 'https://github.com'     },
  ];

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { error: subErr } = await supabase.from('subscriptions').insert(
    subs.map(s => ({
      ...s,
      user_id:           userId,
      category_id:       catMap['Subscriptions'],
      billing_cycle:     'MONTHLY',
      status:            'ACTIVE',
      reminder_days:     3,
      start_date:        new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString(),
      next_billing_date: nextMonth,
    }))
  );
  if (subErr) console.error('Subscriptions error:', subErr);
  else console.log(`   ✅ ${subs.length} subscriptions`);

  // ── Savings Goals ────────────────────────────────────
  console.log('🐷 Creating savings goals...');
  const { error: goalErr } = await supabase.from('savings_goals').insert([
    { user_id: userId, name: 'Emergency Fund',   target_amount: 15000, saved_amount: 6500,  color: '#10b981', icon: 'shield'  },
    { user_id: userId, name: 'Vacation 2025',    target_amount: 4000,  saved_amount: 1200,  color: '#3b82f6', icon: 'plane'   },
    { user_id: userId, name: 'New MacBook',      target_amount: 2500,  saved_amount: 1750,  color: '#8b5cf6', icon: 'laptop'  },
    { user_id: userId, name: 'Car Down Payment', target_amount: 8000,  saved_amount: 2300,  color: '#f59e0b', icon: 'car'     },
  ]);
  if (goalErr) console.error('Savings goals error:', goalErr);
  else console.log('   ✅ 4 savings goals');

  // ── Budgets for current month ────────────────────────
  console.log('🎯 Creating budgets...');
  const budgetDefs = [
    { category: 'Food & Dining', amount: 500 },
    { category: 'Transport',     amount: 200 },
    { category: 'Shopping',      amount: 300 },
    { category: 'Entertainment', amount: 150 },
    { category: 'Health',        amount: 100 },
    { category: 'Bills',         amount: 250 },
  ];

  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const mStart = new Date(year, month - 1, 1).toISOString();
  const mEnd   = new Date(year, month,     0, 23, 59, 59).toISOString();

  for (const b of budgetDefs) {
    const { data: spentData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_id', catMap[b.category])
      .eq('type', 'EXPENSE')
      .gte('date', mStart)
      .lte('date', mEnd);

    const spent = (spentData ?? []).reduce((s, t) => s + t.amount, 0);

    await supabase.from('budgets').upsert({
      user_id:     userId,
      category_id: catMap[b.category],
      amount:      b.amount,
      spent,
      month,
      year,
      alert_at:    80,
    }, { onConflict: 'user_id,category_id,month,year' });
  }
  console.log(`   ✅ ${budgetDefs.length} budgets`);

  console.log('\n' + '─'.repeat(50));
  console.log('🎉 Seed complete!\n');
  console.log('Demo login:');
  console.log('  Email:    demo@financetracker.io');
  console.log('  Password: demo1234');
  console.log('─'.repeat(50));
}

seed().catch(e => { console.error('❌ Seed failed:', e); process.exit(1); });
