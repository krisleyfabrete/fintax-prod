-- Debts module

-- Enums for debts
DO $$ BEGIN
  CREATE TYPE debt_visibility AS ENUM ('private','shared','household');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE debt_interest_type AS ENUM ('monthly','annual','fixed','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE debt_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE debt_status AS ENUM ('open','negotiating','installment','overdue','paid','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Debts table
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  creditor TEXT NOT NULL,
  description TEXT,

  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visibility debt_visibility DEFAULT 'private',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  original_amount numeric(15,2) NOT NULL,

  interest_rate numeric(15,4),
  interest_type debt_interest_type,
  has_interest boolean DEFAULT false,

  penalty_rate numeric(15,4),
  has_penalty boolean DEFAULT false,

  installment_enabled boolean DEFAULT false,
  installment_count INT,
  installment_amount numeric(15,2),

  start_date date,
  due_date date,

  lump_sum_settlement_amount numeric(15,2),
  allows_early_payment boolean DEFAULT false,

  priority debt_priority DEFAULT 'medium',

  status debt_status DEFAULT 'open',

  notes text,

  paid_amount numeric(15,2) DEFAULT 0,
  remaining_amount numeric(15,2),
  paid_percentage numeric(5,2) DEFAULT 0,
  settled_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON public.debts(due_date);
CREATE INDEX IF NOT EXISTS idx_debts_household_id ON public.debts(household_id);

-- Link transactions to debts (optional)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_debt_id ON public.transactions(debt_id);

-- RLS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own debts"
  ON public.debts
  FOR ALL
  USING (
    user_id = auth.uid()
    OR
    visibility IN ('shared','household')
    AND
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.user_id = auth.uid()
      AND family_members.group_id = debts.household_id
    )
  )
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger
do $$
declare t text;
begin
  foreach t in array array['debts'] loop
    execute format('drop trigger if exists trg_updated_at_%1$s on public.%1$s', t);
    execute format('create trigger trg_updated_at_%1$s before update on public.%1$s for each row execute function public.update_updated_at_column()', t);
  end loop;
end $$;
