export interface AiConversation {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'function' | 'system';
  content?: string;
  tool_call?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AiAuditLog {
  id: string;
  user_id: string;
  action: string;
  parameters?: Record<string, unknown>;
  result?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  context: 'client' | 'admin';
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
}

export interface AiBlockedIp {
  id: string;
  ip_address: string;
  reason: string;
  blocked_by: 'system' | 'admin';
  blocked_at: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface AiFeedback {
  id: string;
  user_id: string;
  message_id?: string;
  rating: number;
  feedback?: string;
  created_at: string;
}
