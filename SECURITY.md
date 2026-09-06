# Security Guidelines

## Secrets Management

### Current Status
Client-side AI calls to Google Gemini are now proxied through the Supabase Edge Function `ai-chat` (`supabase/functions/ai-chat/index.ts`). The Gemini API key is stored server-side as the `GEMINI_API_KEY` secret and is no longer exposed in client-side JavaScript.

### Completed Migration
1. ✅ Created Edge Function in `supabase/functions/ai-chat/`
2. ✅ Updated client code to call edge function instead of direct API calls:
   - `src/pages/AIChat.tsx`
   - `src/pages/MobileAIChat.tsx`
   - `src/pages/admin/AdminAIChat.tsx`
3. ✅ Removed `VITE_GEMINI_API_KEY` from `.env` and `.env.example`
4. ⚠️ Add `GEMINI_API_KEY` to Supabase Dashboard → Edge Functions → Secrets

### Remaining Actions
- [ ] Rotate all exposed keys (Gemini, Asaas, Supabase service role, DB password)
- [ ] Remove secrets from git history using `git filter-repo` or BFG
- [ ] Verify Edge Function is deployed and working in production

### Environment Configuration
- `.env.example` — template with placeholder values
- `.env.development` — local development secrets
- `.env.staging` — staging environment
- `.env.production` — production secrets (never commit)
