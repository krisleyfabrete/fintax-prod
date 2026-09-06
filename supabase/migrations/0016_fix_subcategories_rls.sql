-- Fix RLS for subcategories to allow access to default categories and user-owned categories

-- Drop the overly restrictive policy
drop policy if exists "Users manage own subcategories" on public.subcategories;

-- Create new comprehensive policy
create policy "Users manage own subcategories" on public.subcategories for all using (
  -- Allow if category is default (system-wide)
  exists (select 1 from public.categories c where c.id = subcategories.category_id and c.is_default = true)
  or
  -- Allow if category belongs to the user
  exists (select 1 from public.categories c where c.id = subcategories.category_id and c.user_id = auth.uid())
) with check (
  -- For insert/update, ensure category is either default or owned by user
  exists (select 1 from public.categories c where c.id = subcategories.category_id and 
    (c.is_default = true or c.user_id = auth.uid()))
);

-- Also allow viewing subcategories for default categories (read-only fallback)
create policy "Anyone can view subcategories of default categories" on public.subcategories for select using (
  exists (select 1 from public.categories c where c.id = subcategories.category_id and c.is_default = true)
);

-- Admins can view all subcategories
create policy "Admins can view all subcategories" on public.subcategories for select using (
  public.has_role(auth.uid(), 'admin')
);
