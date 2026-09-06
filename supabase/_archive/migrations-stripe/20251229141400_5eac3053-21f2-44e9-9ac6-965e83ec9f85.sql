-- Create table for pending join requests
CREATE TABLE public.family_pending_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.family_pending_invites ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending invites
CREATE POLICY "Users can view own pending invites"
ON public.family_pending_invites
FOR SELECT
USING (auth.uid() = user_id);

-- Group admins can view pending invites for their groups
CREATE POLICY "Admins can view group pending invites"
ON public.family_pending_invites
FOR SELECT
USING (public.is_group_admin(auth.uid(), group_id));

-- App admins can view all pending invites
CREATE POLICY "App admins can view all pending invites"
ON public.family_pending_invites
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own pending invites
CREATE POLICY "Users can request to join groups"
ON public.family_pending_invites
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Group admins can update pending invites (approve/reject)
CREATE POLICY "Admins can update pending invites"
ON public.family_pending_invites
FOR UPDATE
USING (public.is_group_admin(auth.uid(), group_id));

-- Users can delete their own pending invites
CREATE POLICY "Users can cancel own pending invites"
ON public.family_pending_invites
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- Group admins can delete pending invites
CREATE POLICY "Admins can delete pending invites"
ON public.family_pending_invites
FOR DELETE
USING (public.is_group_admin(auth.uid(), group_id));