-- ALBUMEVI Final Combined SQL Migration Script for Payment Tracking

-- 1. Schools Payment Tracking
ALTER TABLE schools ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS school_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'payment' (ödeme) or 'debt' (borç)
  amount numeric NOT NULL,
  description text,
  currency text DEFAULT 'TRY',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Print Expenses (Baskı) Payment Tracking
ALTER TABLE print_expenses ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;
ALTER TABLE print_expenses ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT 0;

-- 3. Firm Transactions (Firma) Payment Tracking
CREATE TABLE IF NOT EXISTS firm_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'payment' or 'debt'
  amount numeric NOT NULL,
  description text,
  currency text DEFAULT 'TRY',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Employee Salary Transactions (Maaş) Tracking
CREATE TABLE IF NOT EXISTS salary_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'salary_payment', 'debt_addition', 'advance'
  amount numeric NOT NULL,
  description text,
  currency text DEFAULT 'TRY',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Albumevi Sales Payment Tracking
ALTER TABLE albumevi_sales ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;

-- Optionally grant permissions to authenticated users for the new tables
GRANT ALL ON school_transactions TO authenticated;
GRANT ALL ON firm_transactions TO authenticated;
GRANT ALL ON salary_transactions TO authenticated;
