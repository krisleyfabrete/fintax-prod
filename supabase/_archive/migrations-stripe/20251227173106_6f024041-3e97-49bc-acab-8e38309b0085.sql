-- Create family groups table
CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create family members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Add visibility columns to existing tables
ALTER TABLE public.accounts ADD COLUMN is_shared_with_family BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN is_shared_with_family BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.budgets ADD COLUMN is_shared_with_family BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.goals ADD COLUMN is_shared_with_family BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_groups
CREATE POLICY "Users can view groups they belong to"
ON public.family_groups FOR SELECT
USING (
  id IN (
    SELECT group_id FROM public.family_members WHERE user_id = auth.uid()
  )
  OR owner_id = auth.uid()
);

CREATE POLICY "Users can create groups"
ON public.family_groups FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their groups"
ON public.family_groups FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their groups"
ON public.family_groups FOR DELETE
USING (owner_id = auth.uid());

-- RLS policies for family_members
CREATE POLICY "Members can view their group members"
ON public.family_members FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM public.family_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can join groups"
ON public.family_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update members"
ON public.family_members FOR UPDATE
USING (
  group_id IN (
    SELECT group_id FROM public.family_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can remove members or member can leave"
ON public.family_members FOR DELETE
USING (
  user_id = auth.uid() 
  OR group_id IN (
    SELECT group_id FROM public.family_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to get family group by invite code (public access)
CREATE OR REPLACE FUNCTION public.get_group_by_invite_code(code TEXT)
RETURNS TABLE(id UUID, name TEXT, description TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, description
  FROM public.family_groups
  WHERE invite_code = code;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_family_groups_updated_at
  BEFORE UPDATE ON public.family_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add owner as admin member when group is created
CREATE OR REPLACE FUNCTION public.add_owner_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.family_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_family_group_created
  AFTER INSERT ON public.family_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_owner_as_admin();