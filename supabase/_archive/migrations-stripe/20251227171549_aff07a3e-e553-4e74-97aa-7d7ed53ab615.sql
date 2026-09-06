-- Remove duplicate categories, keeping the oldest record
DELETE FROM public.categories a 
USING public.categories b
WHERE a.created_at > b.created_at 
  AND a.name = b.name 
  AND a.type = b.type
  AND a.user_id IS NOT DISTINCT FROM b.user_id;