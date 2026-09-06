import { supabase } from '@/integrations/supabase/client';
import type { AiTool } from './tools';

export const adminTools: AiTool[] = [
  {
    name: 'list_subscriptions',
    description: 'Lista assinaturas com filtros opcionais.',
    parameters: {
      plan: { type: 'string', description: 'Filtro por plano', enum: ['free', 'pro', 'family'] },
      limit: { type: 'number', description: 'Limite de registros (padrão 20)' },
    },
    execute: async (args) => {
      const limit = args.limit ?? 20;
      let query = supabase
        .from('subscriptions')
        .select('id, user_id, plan, status, is_grace_license, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (args.plan) query = query.eq('plan', args.plan);

      const { data, error } = await query;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    },
  },
  {
    name: 'update_subscription_plan',
    description: 'Atualiza o plano de uma assinatura.',
    parameters: {
      subscription_id: { type: 'string', description: 'ID da assinatura', required: true },
      plan: { type: 'string', description: 'Novo plano', required: true, enum: ['free', 'pro', 'family'] },
      is_grace_license: { type: 'boolean', description: 'Define como licença cortesia' },
    },
    execute: async (args) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan: args.plan,
          is_grace_license: args.is_grace_license ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', args.subscription_id)
        .select()
        .single();

      if (error) throw error;
      return JSON.stringify(data);
    },
  },
  {
    name: 'list_users',
    description: 'Lista usuários cadastrados.',
    parameters: {
      limit: { type: 'number', description: 'Limite de registros (padrão 20)' },
    },
    execute: async (args) => {
      const limit = args.limit ?? 20;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, phone, cpf')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return JSON.stringify(data ?? []);
    },
  },
  {
    name: 'list_pix_payments',
    description: 'Lista pagamentos PIX pendentes.',
    parameters: {
      status: { type: 'string', description: 'Filtro por status', enum: ['pending', 'confirmed', 'rejected'] },
    },
    execute: async (args) => {
      let query = supabase
        .from('pix_payments')
        .select('id, amount, status, user_email, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (args.status) query = query.eq('status', args.status);

      const { data, error } = await query;
      if (error) throw error;
      return JSON.stringify(data ?? []);
    },
  },
];
