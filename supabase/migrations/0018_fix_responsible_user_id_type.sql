-- Fix responsible_user_id column type to allow text values like "me", "spouse", "household"

-- Drop the foreign key constraint first
alter table public.debts drop constraint if exists debts_responsible_user_id_fkey;

-- Now alter the column type
alter table public.debts 
  alter column responsible_user_id type text;
