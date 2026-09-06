-- Create goal_reminders table
CREATE TABLE public.goal_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- weekly, biweekly, monthly
  day_of_week INTEGER, -- 0-6 for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own reminders"
ON public.goal_reminders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
ON public.goal_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
ON public.goal_reminders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
ON public.goal_reminders
FOR DELETE
USING (auth.uid() = user_id);

-- Create unique constraint for one reminder per goal
CREATE UNIQUE INDEX goal_reminders_goal_id_unique ON public.goal_reminders(goal_id);

-- Create trigger for updated_at
CREATE TRIGGER update_goal_reminders_updated_at
BEFORE UPDATE ON public.goal_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();