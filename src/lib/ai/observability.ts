import { supabase } from '@/integrations/supabase/client';

export interface AiFeedbackInput {
  userId: string;
  messageId?: string;
  rating: number;
  feedback?: string;
}

export async function submitFeedback(params: AiFeedbackInput): Promise<void> {
  await supabase.from('ai_feedback').insert({
    user_id: params.userId,
    message_id: params.messageId,
    rating: params.rating,
    feedback: params.feedback,
  });
}

export async function getAiMetrics() {
  const [
    { count: totalMessages },
    { count: totalUsers },
    { data: recentMessages },
  ] = await Promise.all([
    supabase.from('ai_conversations').select('*', { count: 'exact', head: true }),
    supabase.from('ai_conversations').select('user_id', { count: 'exact', head: true }),
    supabase.from('ai_conversations').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  const avgRating = await supabase
    .from('ai_feedback')
    .select('rating')
    .then(({ data }) => {
      if (!data?.length) return 0;
      return data.reduce((sum, f) => sum + f.rating, 0) / data.length;
    });

  return {
    totalMessages: totalMessages || 0,
    totalUsers: totalUsers || 0,
    avgRating: avgRating || 0,
    recentMessages: recentMessages || [],
  };
}
