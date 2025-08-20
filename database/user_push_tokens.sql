-- Create table to store user push tokens for notifications
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  push_token TEXT NOT NULL,
  device_id TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One active token per device per user
  UNIQUE(user_id, device_id, platform)
);

-- Index for efficient querying
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_active ON user_push_tokens(active);

-- RLS Policy
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own push tokens
CREATE POLICY user_push_tokens_user_policy ON user_push_tokens
  FOR ALL USING (user_id = auth.uid());

-- Allow the system to read all active tokens for notifications
CREATE POLICY user_push_tokens_system_read_policy ON user_push_tokens
  FOR SELECT USING (active = true);