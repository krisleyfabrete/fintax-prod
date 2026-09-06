import { supabase } from '@/integrations/supabase/client';
import type { AiTool } from './tools';

export const clientTools: AiTool[] = [
  {
    name: 'list_transactions',
    description: 'Lista transações financeiras do usuário com filtros opcionais.',
    parameters: {
      limit: { type: 'number', description: 'Quantidade máxima de registros (padrão 10)' },
      type: { type: 'string', description: 'Filtro por tipo: income ou expense', enum: ['income', 'expense'] },
    },
    execute: async (args) => {
      const limit = args.limit ?? 10;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Usuário não autenticado.';

      let query = supabase
        .from('transactions')
        .select('id, description, amount, type, date, category_id, status')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (args.type) query = query.eq('type', args.type);

      const { data, error } = await query;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    },
  },
  {
    name: 'create_transaction',
    description: 'Cria uma nova transação para o usuário.',
    parameters: {
      description: { type: 'string', description: 'Descrição da transação', required: true },
      amount: { type: 'number', description: 'Valor em reais', required: true },
      type: { type: 'string', description: 'Tipo: income ou expense', required: true, enum: ['income', 'expense'] },
      date: { type: 'string', description: 'Data no formato YYYY-MM-DD (padrão hoje)' },
      category_id: { type: 'string', description: 'UUID da categoria (opcional)' },
    },
    execute: async (args) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Usuário não autenticado.';

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          description: args.description,
          amount: Number(args.amount),
          type: args.type,
          date: args.date ?? new Date().toISOString().split('T')[0],
          category_id: args.category_id ?? null,
          status: 'pending',
        })
        .select('id, description, amount, type, date')
        .single();

      if (error) throw error;
      return JSON.stringify(data);
    },
  },
  {
    name: 'list_goals',
    description: 'Lista metas financeiras do usuário.',
    parameters: {
      limit: { type: 'number', description: 'Quantidade máxima de registros (padrão 10)' },
    },
    execute: async (args) => {
      const limit = args.limit ?? 10;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Usuário não autenticado.';

      const { data, error } = await supabase
        .from('goals')
        .select('id, name, target_amount, current_amount, status, start_date, end_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return JSON.stringify(data ?? []);
    },
  },
  {
    name: 'create_goal',
    description: 'Cria uma nova meta financeira para o usuário.',
    parameters: {
      name: { type: 'string', description: 'Nome da meta', required: true },
      target_amount: { type: 'number', description: 'Valor alvo em reais', required: true },
      start_date: { type: 'string', description: 'Data início YYYY-MM-DD (opcional)' },
      end_date: { type: 'string', description: 'Data fim YYYY-MM-DD (opcional)' },
    },
    execute: async (args) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Usuário não autenticado.';

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: args.name,
          target_amount: Number(args.target_amount),
          current_amount: 0,
          start_date: args.start_date ?? null,
          end_date: args.end_date ?? null,
          status: 'active',
        })
        .select('id, name, target_amount, current_amount, status')
        .single();

      if (error) throw error;
      return JSON.stringify(data);
    },
  },
  {
    name: 'list_accounts',
    description: 'Lista contas financeiras do usuário.',
    parameters: {},
    execute: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Usuário não autenticado.';

      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance, currency')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return JSON.stringify(data ?? []);
    },
  },
];
