-- Criar função para atualizar saldo da conta
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_amount NUMERIC := 0;
  new_amount NUMERIC := 0;
  old_type TEXT := '';
  new_type TEXT := '';
  old_account_id UUID := NULL;
  new_account_id UUID := NULL;
BEGIN
  -- Captura valores antigos (para UPDATE e DELETE)
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_amount := OLD.amount;
    old_type := OLD.type::TEXT;
    old_account_id := OLD.account_id;
  END IF;
  
  -- Captura valores novos (para INSERT e UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_amount := NEW.amount;
    new_type := NEW.type::TEXT;
    new_account_id := NEW.account_id;
  END IF;

  -- Reverte o saldo antigo (UPDATE e DELETE)
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    IF old_type = 'income' THEN
      UPDATE public.accounts SET balance = balance - old_amount WHERE id = old_account_id;
    ELSIF old_type = 'expense' THEN
      UPDATE public.accounts SET balance = balance + old_amount WHERE id = old_account_id;
    END IF;
  END IF;

  -- Aplica o novo saldo (INSERT e UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF new_type = 'income' THEN
      UPDATE public.accounts SET balance = balance + new_amount WHERE id = new_account_id;
    ELSIF new_type = 'expense' THEN
      UPDATE public.accounts SET balance = balance - new_amount WHERE id = new_account_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar triggers para transações
DROP TRIGGER IF EXISTS trigger_update_balance_insert ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_balance_update ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_balance_delete ON public.transactions;

CREATE TRIGGER trigger_update_balance_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

CREATE TRIGGER trigger_update_balance_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

CREATE TRIGGER trigger_update_balance_delete
  AFTER DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();