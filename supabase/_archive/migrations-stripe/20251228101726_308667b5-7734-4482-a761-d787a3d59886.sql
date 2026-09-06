-- Tabela para armazenar tokens de push notification dos usuários
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Índice para busca rápida por user_id
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Habilitar realtime para tickets e mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

-- Tabela para analytics de eventos
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para analytics
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
ON public.analytics_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
ON public.analytics_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Índices para analytics
CREATE INDEX idx_analytics_user ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_created ON public.analytics_events(created_at DESC);