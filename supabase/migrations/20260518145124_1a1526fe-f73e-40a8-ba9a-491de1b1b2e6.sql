-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Schools
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  login_username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  unique_link_slug text NOT NULL UNIQUE,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  package_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  order_status text NOT NULL DEFAULT 'Pending'
    CHECK (order_status IN ('Pending','Processing','Completed','Shipped')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_school_id ON public.orders(school_id);

-- Inventory
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  stock_count integer NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Finances
CREATE TABLE public.finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  total_revenue numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  balance_due numeric(12,2) GENERATED ALWAYS AS (total_revenue - amount_paid) STORED,
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finances_school_id ON public.finances(school_id);

-- Enable RLS on all tables. No policies are added: all access flows through
-- trusted server functions using the service role. Browser clients are denied.
ALTER TABLE public.schools   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances  ENABLE ROW LEVEL SECURITY;

-- Helper functions for password hashing/verification (used by server functions)
CREATE OR REPLACE FUNCTION public.hash_password(plain text)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT crypt(plain, gen_salt('bf', 10));
$$;

CREATE OR REPLACE FUNCTION public.verify_school_password(_username text, _password text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id FROM public.schools
  WHERE login_username = _username
    AND password_hash = crypt(_password, password_hash)
  LIMIT 1;
$$;

-- Seed some inventory so the dashboard isn't empty on first load
INSERT INTO public.inventory (item_name, stock_count, unit_price) VALUES
  ('Photo Print 8x10', 1240, 1.50),
  ('Wooden Frame A', 86, 12.00),
  ('Yearbook 2024', 412, 18.00),
  ('USB Photo Stick', 32, 9.00);
