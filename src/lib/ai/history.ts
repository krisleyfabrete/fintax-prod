import { supabase } from '@/integrations/supabase/client';
import type { AiConversation } from './types';

const HISTORY_KEY = 'fintax_ai_history';
const MAX_LOCAL_MESSAGES = 50;

export async function saveMessage(
  userId: string,
  message: Omit<AiConversation, 'id' | 'user_id' | 'created_at'>
): Promise<AiConversation> {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        ...message,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving AI message:', error);
    }

    const saved: AiConversation = {
      id: data?.id || crypto.randomUUID(),
      user_id: userId,
      ...message,
      created_at: data?.created_at || new Date().toISOString(),
    };

    // Also keep local cache for quick loading
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const local = raw ? JSON.parse(raw) : [];
      local.push(saved);
      if (local.length > MAX_LOCAL_MESSAGES) {
        local.splice(0, local.length - MAX_LOCAL_MESSAGES);
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(local));
    } catch { /* ignore */ }

    return saved;
  } catch {
    const fallback: AiConversation = {
      id: crypto.randomUUID(),
      user_id: userId,
      ...message,
      created_at: new Date().toISOString(),
    };
    return fallback;
  }
}

export async function loadHistory(
  userId: string,
  limit = 50
): Promise<AiConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error loading AI history:', error);
    return [];
  }

  return (data || []).reverse();
}

export async function clearHistory(userId: string): Promise<void> {
  try {
    await supabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', userId);
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch { /* ignore */ }
}

export function getLocalHistory(): AiConversation[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
