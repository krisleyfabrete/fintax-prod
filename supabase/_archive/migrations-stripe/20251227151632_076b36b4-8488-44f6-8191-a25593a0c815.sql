-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('user', 'premium', 'admin');

-- Criar enum para tipo de transação
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Criar enum para status de transação
CREATE TYPE public.transaction_status AS ENUM ('pending', 'confirmed');

-- Criar enum para recorrência
CREATE TYPE public.recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly');

-- Criar enum para tipo de conta
CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other');

-- Criar enum para plano de assinatura
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'family');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    currency TEXT DEFAULT 'BRL',
    date_format TEXT DEFAULT 'dd/MM/yyyy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de roles de usuário (separada por segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Tabela de assinaturas
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan subscription_plan NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de contas bancárias/carteiras
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type account_type NOT NULL DEFAULT 'checking',
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#8B5CF6',
    icon TEXT DEFAULT 'wallet',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de categorias (pré-definidas e personalizáveis)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type transaction_type NOT NULL,
    color TEXT NOT NULL DEFAULT '#8B5CF6',
    icon TEXT NOT NULL DEFAULT 'tag',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de transações
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type transaction_type NOT NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status transaction_status NOT NULL DEFAULT 'confirmed',
    recurrence recurrence_type DEFAULT 'none',
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Função para verificar role do usuário (Security Definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Políticas para profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Políticas para user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Políticas para subscriptions
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Políticas para accounts
CREATE POLICY "Users can view own accounts"
ON public.accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
ON public.accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
ON public.accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
ON public.accounts FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para categories (incluir categorias default públicas)
CREATE POLICY "Users can view own and default categories"
ON public.categories FOR SELECT
USING (auth.uid() = user_id OR is_default = true);

CREATE POLICY "Users can insert own categories"
ON public.categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
ON public.categories FOR UPDATE
USING (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can delete own categories"
ON public.categories FOR DELETE
USING (auth.uid() = user_id AND is_default = false);

-- Políticas para transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id);

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    INSERT INTO public.subscriptions (user_id, plan)
    VALUES (NEW.id, 'free');
    
    RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir categorias pré-definidas (despesas)
INSERT INTO public.categories (name, type, color, icon, is_default) VALUES
('Alimentação', 'expense', '#EF4444', 'utensils', true),
('Transporte', 'expense', '#F97316', 'car', true),
('Moradia', 'expense', '#8B5CF6', 'home', true),
('Saúde', 'expense', '#EC4899', 'heart', true),
('Educação', 'expense', '#3B82F6', 'graduation-cap', true),
('Lazer', 'expense', '#10B981', 'gamepad-2', true),
('Compras', 'expense', '#F59E0B', 'shopping-bag', true),
('Serviços', 'expense', '#6366F1', 'wrench', true),
('Outros', 'expense', '#64748B', 'more-horizontal', true);

-- Inserir categorias pré-definidas (receitas)
INSERT INTO public.categories (name, type, color, icon, is_default) VALUES
('Salário', 'income', '#10B981', 'banknote', true),
('Freelance', 'income', '#3B82F6', 'laptop', true),
('Investimentos', 'income', '#8B5CF6', 'trending-up', true),
('Vendas', 'income', '#F97316', 'store', true),
('Presentes', 'income', '#EC4899', 'gift', true),
('Outros', 'income', '#64748B', 'more-horizontal', true);