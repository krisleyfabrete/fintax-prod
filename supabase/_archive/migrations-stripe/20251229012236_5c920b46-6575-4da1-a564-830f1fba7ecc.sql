-- Criar enum para tipos de investimento
CREATE TYPE public.investment_type AS ENUM ('stock', 'fii', 'crypto', 'fixed_income', 'treasury', 'etf', 'bdr', 'other');

-- Tabela de Corretoras
CREATE TABLE public.brokers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'building-2',
    color TEXT DEFAULT '#8B5CF6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Carteiras de Investimento
CREATE TABLE public.investment_portfolios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_shared_with_family BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Investimentos/Ativos
CREATE TABLE public.investments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    portfolio_id UUID REFERENCES public.investment_portfolios(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    name TEXT NOT NULL,
    type public.investment_type NOT NULL DEFAULT 'stock',
    quantity NUMERIC NOT NULL DEFAULT 0,
    purchase_price NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC NOT NULL DEFAULT 0,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brokers
CREATE POLICY "Users can view own brokers" ON public.brokers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brokers" ON public.brokers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brokers" ON public.brokers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brokers" ON public.brokers FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all brokers" ON public.brokers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for investment_portfolios
CREATE POLICY "Users can view own portfolios" ON public.investment_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolios" ON public.investment_portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.investment_portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.investment_portfolios FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all portfolios" ON public.investment_portfolios FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for investments
CREATE POLICY "Users can view own investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investments" ON public.investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investments" ON public.investments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all investments" ON public.investments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_brokers_updated_at BEFORE UPDATE ON public.brokers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_investment_portfolios_updated_at BEFORE UPDATE ON public.investment_portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();