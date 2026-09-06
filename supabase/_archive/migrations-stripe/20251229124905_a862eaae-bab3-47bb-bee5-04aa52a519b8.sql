-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  is_default BOOLEAN DEFAULT false,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own and default subcategories"
ON public.subcategories FOR SELECT
USING ((auth.uid() = user_id) OR (is_default = true));

CREATE POLICY "Users can insert own subcategories"
ON public.subcategories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subcategories"
ON public.subcategories FOR UPDATE
USING ((auth.uid() = user_id) AND (is_default = false));

CREATE POLICY "Users can delete own subcategories"
ON public.subcategories FOR DELETE
USING ((auth.uid() = user_id) AND (is_default = false));

-- Add subcategory_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Insert default subcategories for existing categories
-- For expense categories

-- Alimentação subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Restaurante', 'utensils', color, true FROM public.categories WHERE name = 'Alimentação' AND is_default = true
UNION ALL
SELECT id, 'Supermercado', 'shopping-cart', color, true FROM public.categories WHERE name = 'Alimentação' AND is_default = true
UNION ALL
SELECT id, 'Delivery', 'bike', color, true FROM public.categories WHERE name = 'Alimentação' AND is_default = true
UNION ALL
SELECT id, 'Lanche', 'coffee', color, true FROM public.categories WHERE name = 'Alimentação' AND is_default = true;

-- Transporte subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Combustível', 'fuel', color, true FROM public.categories WHERE name = 'Transporte' AND is_default = true
UNION ALL
SELECT id, 'Uber/99', 'car', color, true FROM public.categories WHERE name = 'Transporte' AND is_default = true
UNION ALL
SELECT id, 'Transporte Público', 'bus', color, true FROM public.categories WHERE name = 'Transporte' AND is_default = true
UNION ALL
SELECT id, 'Estacionamento', 'parking-circle', color, true FROM public.categories WHERE name = 'Transporte' AND is_default = true
UNION ALL
SELECT id, 'Manutenção Veículo', 'wrench', color, true FROM public.categories WHERE name = 'Transporte' AND is_default = true;

-- Moradia subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Aluguel', 'home', color, true FROM public.categories WHERE name = 'Moradia' AND is_default = true
UNION ALL
SELECT id, 'Condomínio', 'building', color, true FROM public.categories WHERE name = 'Moradia' AND is_default = true
UNION ALL
SELECT id, 'IPTU', 'file-text', color, true FROM public.categories WHERE name = 'Moradia' AND is_default = true
UNION ALL
SELECT id, 'Manutenção Casa', 'hammer', color, true FROM public.categories WHERE name = 'Moradia' AND is_default = true;

-- Contas subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Energia', 'zap', color, true FROM public.categories WHERE name = 'Contas' AND is_default = true
UNION ALL
SELECT id, 'Água', 'droplets', color, true FROM public.categories WHERE name = 'Contas' AND is_default = true
UNION ALL
SELECT id, 'Internet', 'wifi', color, true FROM public.categories WHERE name = 'Contas' AND is_default = true
UNION ALL
SELECT id, 'Telefone', 'phone', color, true FROM public.categories WHERE name = 'Contas' AND is_default = true
UNION ALL
SELECT id, 'Streaming', 'tv', color, true FROM public.categories WHERE name = 'Contas' AND is_default = true;

-- Saúde subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Consulta Médica', 'stethoscope', color, true FROM public.categories WHERE name = 'Saúde' AND is_default = true
UNION ALL
SELECT id, 'Farmácia', 'pill', color, true FROM public.categories WHERE name = 'Saúde' AND is_default = true
UNION ALL
SELECT id, 'Plano de Saúde', 'heart-pulse', color, true FROM public.categories WHERE name = 'Saúde' AND is_default = true
UNION ALL
SELECT id, 'Exames', 'clipboard-list', color, true FROM public.categories WHERE name = 'Saúde' AND is_default = true;

-- Lazer subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Cinema/Teatro', 'clapperboard', color, true FROM public.categories WHERE name = 'Lazer' AND is_default = true
UNION ALL
SELECT id, 'Viagem', 'plane', color, true FROM public.categories WHERE name = 'Lazer' AND is_default = true
UNION ALL
SELECT id, 'Shows/Eventos', 'ticket', color, true FROM public.categories WHERE name = 'Lazer' AND is_default = true
UNION ALL
SELECT id, 'Hobbies', 'gamepad-2', color, true FROM public.categories WHERE name = 'Lazer' AND is_default = true;

-- Educação subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Cursos', 'graduation-cap', color, true FROM public.categories WHERE name = 'Educação' AND is_default = true
UNION ALL
SELECT id, 'Livros', 'book', color, true FROM public.categories WHERE name = 'Educação' AND is_default = true
UNION ALL
SELECT id, 'Faculdade', 'building-2', color, true FROM public.categories WHERE name = 'Educação' AND is_default = true
UNION ALL
SELECT id, 'Material Escolar', 'pencil', color, true FROM public.categories WHERE name = 'Educação' AND is_default = true;

-- Compras subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Roupas', 'shirt', color, true FROM public.categories WHERE name = 'Compras' AND is_default = true
UNION ALL
SELECT id, 'Eletrônicos', 'laptop', color, true FROM public.categories WHERE name = 'Compras' AND is_default = true
UNION ALL
SELECT id, 'Casa e Decoração', 'lamp', color, true FROM public.categories WHERE name = 'Compras' AND is_default = true
UNION ALL
SELECT id, 'Presentes', 'gift', color, true FROM public.categories WHERE name = 'Compras' AND is_default = true;

-- For income categories

-- Salário subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Salário Mensal', 'wallet', color, true FROM public.categories WHERE name = 'Salário' AND is_default = true
UNION ALL
SELECT id, '13º Salário', 'calendar', color, true FROM public.categories WHERE name = 'Salário' AND is_default = true
UNION ALL
SELECT id, 'Férias', 'sun', color, true FROM public.categories WHERE name = 'Salário' AND is_default = true
UNION ALL
SELECT id, 'Bônus', 'trophy', color, true FROM public.categories WHERE name = 'Salário' AND is_default = true;

-- Freelance subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Projeto', 'folder', color, true FROM public.categories WHERE name = 'Freelance' AND is_default = true
UNION ALL
SELECT id, 'Consultoria', 'briefcase', color, true FROM public.categories WHERE name = 'Freelance' AND is_default = true
UNION ALL
SELECT id, 'Serviço', 'wrench', color, true FROM public.categories WHERE name = 'Freelance' AND is_default = true;

-- Investimentos subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Dividendos', 'coins', color, true FROM public.categories WHERE name = 'Investimentos' AND is_default = true
UNION ALL
SELECT id, 'Juros', 'percent', color, true FROM public.categories WHERE name = 'Investimentos' AND is_default = true
UNION ALL
SELECT id, 'Rendimentos', 'trending-up', color, true FROM public.categories WHERE name = 'Investimentos' AND is_default = true
UNION ALL
SELECT id, 'Venda de Ativos', 'banknote', color, true FROM public.categories WHERE name = 'Investimentos' AND is_default = true;

-- Vendas subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Produto', 'package', color, true FROM public.categories WHERE name = 'Vendas' AND is_default = true
UNION ALL
SELECT id, 'Usado', 'recycle', color, true FROM public.categories WHERE name = 'Vendas' AND is_default = true;

-- Presente/Prêmio subcategories
INSERT INTO public.subcategories (category_id, name, icon, color, is_default)
SELECT id, 'Presente em Dinheiro', 'gift', color, true FROM public.categories WHERE name = 'Presente' AND is_default = true
UNION ALL
SELECT id, 'Prêmio/Sorteio', 'sparkles', color, true FROM public.categories WHERE name = 'Presente' AND is_default = true;

-- Create index for performance
CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX idx_transactions_subcategory_id ON public.transactions(subcategory_id);