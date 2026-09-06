-- Tabela para histórico de patrimônio (snapshots diários/mensais)
CREATE TABLE public.investment_snapshots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    total_invested NUMERIC NOT NULL DEFAULT 0,
    total_current_value NUMERIC NOT NULL DEFAULT 0,
    total_profit NUMERIC NOT NULL DEFAULT 0,
    profit_percentage NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, snapshot_date)
);

-- Tabela para histórico de preços dos ativos
CREATE TABLE public.investment_price_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE,
    price_date DATE NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(investment_id, price_date)
);

-- Enable RLS
ALTER TABLE public.investment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investment_snapshots
CREATE POLICY "Users can view own snapshots" ON public.investment_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots" ON public.investment_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own snapshots" ON public.investment_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own snapshots" ON public.investment_snapshots FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for investment_price_history (via investment ownership)
CREATE POLICY "Users can view own price history" ON public.investment_price_history FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.investments WHERE investments.id = investment_price_history.investment_id AND investments.user_id = auth.uid()));

CREATE POLICY "Users can insert own price history" ON public.investment_price_history FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.investments WHERE investments.id = investment_price_history.investment_id AND investments.user_id = auth.uid()));

CREATE POLICY "Users can delete own price history" ON public.investment_price_history FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.investments WHERE investments.id = investment_price_history.investment_id AND investments.user_id = auth.uid()));