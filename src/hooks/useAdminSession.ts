import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AdminSession {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  last_seen: string;
}

export function useAdminSession() {
  const { user, session, signOut } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const userRef = useRef(user);
  const sessionRef = useRef(session);
  userRef.current = user;
  sessionRef.current = session;

  const ensureSession = useCallback(async () => {
    const currentUser = userRef.current;
    const currentSession = sessionRef.current;
    if (!currentUser || !currentSession) return null;
    
    const sessionId = currentSession.access_token;
    if (!sessionId) return null;

    setIsChecking(true);
    try {
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('user_id', currentUser.id);

      const { data, error } = await supabase
        .from('admin_sessions')
        .insert({
          user_id: currentUser.id,
          session_id: sessionId,
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentSessionId(data?.session_id || sessionId);
      return data;
    } catch (error) {
      console.error('Error ensuring admin session:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const verifySession = useCallback(async () => {
    const currentUser = userRef.current;
    const currentSession = sessionRef.current;
    if (!currentUser || !currentSession) return false;
    
    const sessionId = currentSession.access_token;
    if (!sessionId) return false;

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('admin_sessions')
        .select('session_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error || !data) return false;

      const isValid = data.session_id === sessionId;
      if (!isValid) {
        await signOut();
        toast.error('Sua sessão foi encerrada porque outro dispositivo acessou o painel administrativo.');
      }
      return isValid;
    } catch (error) {
      console.error('Error verifying admin session:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [signOut]);

  const invalidateSession = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('user_id', currentUser.id);
  }, []);

  useEffect(() => {
    if (!user || !session) return;
    ensureSession();
  }, [user, session, ensureSession]);

  return {
    currentSessionId,
    isChecking,
    ensureSession,
    verifySession,
    invalidateSession,
  };
}
