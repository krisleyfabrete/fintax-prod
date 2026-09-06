# Deploy — Fintax Finanças
## Checklist

1. **Banco de dados (Supabase)**
   - Aplicar a migration `supabase/migrations/0013_debts_module.sql` no projeto Supabase de produção.
   - Confirmar que a tabela `debts` e a coluna `transactions.debt_id` existem.

2. **Segredos / Variáveis de ambiente**
   - Configurar na Vercel as variáveis do `.env` que realmente são usadas no client/build:
     - `VITE_SUPABASE_PROJECT_ID`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - NÃO versionar `.env` no repositório.
   - `GEMINI_API_KEY`, `ASAAS_API_KEY` e `ASAAS_TOKEN` devem ficar apenas no Supabase Edge Functions/ambiente server-side, não na Vercel.

3. **Vercel**
   - Conectar o repositório no Vercel.
   - Framework: Vite.
   - Build command: `npm run build`.
   - Output directory: `dist`.
   - `vercel.json` já está configurado com rewrite SPA.

4. **Domínio**
   - Adicionar domínio customizado `fintax.arklink.com.br` no Vercel.
   - Configurar DNS no provedor do domínio para apontar para a Vercel.

5. **Pós-deploy**
   - Validar login, rotas principais e fluxo do módulo de Dívidas.
   - Validar chamadas do módulo de IA via Edge Function.
