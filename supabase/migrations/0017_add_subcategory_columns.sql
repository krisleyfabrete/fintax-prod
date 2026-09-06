-- Add missing columns to subcategories table

alter table public.subcategories 
  add column if not exists icon text default 'tag',
  add column if not exists color text default '#8B5CF6',
  add column if not exists is_default boolean default false,
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Update existing rows to have default values
update public.subcategories 
set 
  icon = coalesce(icon, 'tag'),
  color = coalesce(color, '#8B5CF6'),
  is_default = coalesce(is_default, false)
where icon is null or color is null or is_default is null;

-- Create index for better performance
create index if not exists idx_subcategories_category_id on public.subcategories(category_id);
create index if not exists idx_subcategories_user_id on public.subcategories(user_id);
