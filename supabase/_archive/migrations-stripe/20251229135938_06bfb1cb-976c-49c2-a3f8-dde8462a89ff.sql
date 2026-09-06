-- Add BRAPI API key column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS brapi_api_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.brapi_api_key IS 'User personal BRAPI API key for fetching stock quotes';