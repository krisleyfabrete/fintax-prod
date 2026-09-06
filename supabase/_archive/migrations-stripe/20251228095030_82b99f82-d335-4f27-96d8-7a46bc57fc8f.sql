-- Create unique index on CPF (ignoring nulls and empty strings)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique 
ON public.profiles (cpf) 
WHERE cpf IS NOT NULL AND cpf != '';

-- Function to check if CPF is already used by another user
CREATE OR REPLACE FUNCTION public.check_cpf_exists(p_cpf text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE cpf = p_cpf
      AND id != p_user_id
      AND cpf IS NOT NULL
      AND cpf != ''
  )
$$;