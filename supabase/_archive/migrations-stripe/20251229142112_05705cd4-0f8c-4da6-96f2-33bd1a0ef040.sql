-- Create table for downgrade requests
CREATE TABLE public.downgrade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL DEFAULT 'free',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.downgrade_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own downgrade requests"
ON public.downgrade_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create their own downgrade requests"
ON public.downgrade_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all downgrade requests"
ON public.downgrade_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update downgrade requests"
ON public.downgrade_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_downgrade_requests_updated_at
BEFORE UPDATE ON public.downgrade_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();