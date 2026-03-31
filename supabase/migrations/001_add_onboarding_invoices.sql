-- ============================================================
-- Migration: Add onboarding_complete + invoices table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create profiles table if it doesn't exist, or add onboarding_complete column
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- 2. Auto-create profile row on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, onboarding_complete)
  VALUES (NEW.id, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill existing users
INSERT INTO profiles (id, onboarding_complete)
SELECT id, false FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  client_name    TEXT NOT NULL,
  client_email   TEXT NOT NULL,
  line_items     JSONB NOT NULL DEFAULT '[]',
  currency       TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','PKR')),
  total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date       DATE,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  paid_at        TIMESTAMPTZ
);

-- 5. Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;

CREATE POLICY "Users can manage own invoices"
  ON invoices FOR ALL USING (auth.uid() = user_id);

-- 6. Index for faster queries
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices (user_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx  ON invoices (status);
