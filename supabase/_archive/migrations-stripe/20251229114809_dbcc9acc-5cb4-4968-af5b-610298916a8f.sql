-- Create table for goal auto-deposits configuration
CREATE TABLE public.goal_auto_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(goal_id) -- Only one auto-deposit per goal
);

-- Enable RLS
ALTER TABLE public.goal_auto_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own auto deposits"
ON public.goal_auto_deposits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own auto deposits"
ON public.goal_auto_deposits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own auto deposits"
ON public.goal_auto_deposits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own auto deposits"
ON public.goal_auto_deposits
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_goal_auto_deposits_updated_at
BEFORE UPDATE ON public.goal_auto_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();