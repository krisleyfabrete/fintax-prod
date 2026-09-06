-- Tabela de cupons de desconto
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de tickets de suporte
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mensagens dos tickets
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);

-- RLS para cupons (somente admins)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active coupons by code"
ON public.coupons
FOR SELECT
USING (is_active = true);

-- RLS para tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets"
ON public.support_tickets
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS para mensagens
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own tickets"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = ticket_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can add messages to own tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = ticket_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all messages"
ON public.ticket_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can add messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers de updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();