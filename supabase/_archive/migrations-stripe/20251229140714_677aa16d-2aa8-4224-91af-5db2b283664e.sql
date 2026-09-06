-- Drop existing problematic policies on family_groups
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.family_groups;
DROP POLICY IF EXISTS "Admins can view all family groups" ON public.family_groups;

-- Drop existing problematic policies on family_members
DROP POLICY IF EXISTS "Members can view their group members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove members or member can leave" ON public.family_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can view all family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.family_members;

-- Create helper function to check group membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Create helper function to check if user is group admin without recursion
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role = 'admin'
  )
$$;

-- Recreate policies for family_groups using helper functions
CREATE POLICY "Users can view groups they belong to"
ON public.family_groups
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR public.is_group_member(auth.uid(), id)
);

CREATE POLICY "App admins can view all family groups"
ON public.family_groups
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Recreate policies for family_members using helper functions
CREATE POLICY "Members can view their group members"
ON public.family_members
FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "App admins can view all family members"
ON public.family_members
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can join groups"
ON public.family_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update members"
ON public.family_members
FOR UPDATE
USING (public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "Admins can remove members or member can leave"
ON public.family_members
FOR DELETE
USING (
  user_id = auth.uid() 
  OR public.is_group_admin(auth.uid(), group_id)
);