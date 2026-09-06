-- Create budgets table for monthly category spending limits
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, month, year)
);

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own budgets"
ON public.budgets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
ON public.budgets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
ON public.budgets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
ON public.budgets
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();