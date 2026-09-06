-- Create admin settings table
CREATE TABLE public.admin_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view all settings" 
ON public.admin_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update settings" 
ON public.admin_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete settings
CREATE POLICY "Admins can delete settings" 
ON public.admin_settings 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default PIX alert settings
INSERT INTO public.admin_settings (key, value, description)
VALUES 
  ('pix_alert_hours', '{"hours": 24}'::jsonb, 'Tempo em horas para alertar sobre pagamentos PIX pendentes'),
  ('pix_alert_cooldown_hours', '{"hours": 6}'::jsonb, 'Intervalo mínimo em horas entre alertas de PIX pendentes'),
  ('pix_alerts_enabled', '{"enabled": true}'::jsonb, 'Ativar ou desativar alertas de PIX pendentes');