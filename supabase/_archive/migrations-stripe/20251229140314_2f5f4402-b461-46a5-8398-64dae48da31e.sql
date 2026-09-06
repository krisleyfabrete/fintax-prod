-- Create table to cache stock quotes
CREATE TABLE public.quote_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  change numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cache (quotes are public data)
CREATE POLICY "Authenticated users can view quote cache"
  ON public.quote_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow service role to manage cache (used by edge function)
CREATE POLICY "Service role can manage quote cache"
  ON public.quote_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_quote_cache_ticker ON public.quote_cache(ticker);
CREATE INDEX idx_quote_cache_updated_at ON public.quote_cache(updated_at);

-- Add comment for documentation
COMMENT ON TABLE public.quote_cache IS 'Cache for stock, FII, and crypto quotes to reduce API calls';