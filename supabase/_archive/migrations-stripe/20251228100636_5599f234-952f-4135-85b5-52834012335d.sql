-- Criar tabela de logs de auditoria do admin
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX idx_audit_logs_target_type ON public.admin_audit_logs(target_type);
CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver os logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem inserir logs
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Criar função para registrar ação de admin
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Criar políticas para admins verem dados de todos os usuários
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all accounts"
ON public.accounts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all budgets"
ON public.budgets
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all goals"
ON public.goals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all family groups"
ON public.family_groups
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all family members"
ON public.family_members
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));