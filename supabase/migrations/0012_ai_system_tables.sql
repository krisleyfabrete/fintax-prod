-- AI system tables

-- Conversations history with memory
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'function', 'system')),
  content TEXT,
  tool_call JSONB,
  tool_response JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- Audit log for all AI actions
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  context TEXT NOT NULL CHECK (context IN ('client', 'admin')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user_id ON ai_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON ai_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_severity ON ai_audit_logs(severity);

-- Blocked IPs registry
CREATE TABLE IF NOT EXISTS ai_blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by TEXT NOT NULL CHECK (blocked_by IN ('system', 'admin')),
  blocked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ai_blocked_ips_ip ON ai_blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_ips_expires ON ai_blocked_ips(expires_at);

-- User satisfaction feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_id UUID REFERENCES ai_conversations(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);

-- RLS Policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON ai_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all conversations"
  ON ai_conversations FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can read audit logs"
  ON ai_audit_logs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can manage blocked IPs"
  ON ai_blocked_ips FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

CREATE POLICY "Users can read own feedback"
  ON ai_feedback FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own feedback"
  ON ai_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());
