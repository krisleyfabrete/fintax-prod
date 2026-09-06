-- Add admin_seen_at column to track when admin saw the ticket
ALTER TABLE public.support_tickets 
ADD COLUMN admin_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;