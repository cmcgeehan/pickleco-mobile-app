-- Create table to track sent notifications to prevent duplicates
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_registration_id UUID REFERENCES event_registrations(id) NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('24_hour', '1_hour')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  push_token TEXT,
  notification_id TEXT, -- Store the local notification ID for cancellation
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate notifications for same event and type
  UNIQUE(event_registration_id, notification_type)
);

-- Index for efficient querying
CREATE INDEX idx_notification_logs_event_registration ON notification_logs(event_registration_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);

-- RLS Policy
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notification logs
CREATE POLICY notification_logs_user_policy ON notification_logs
  FOR ALL USING (
    event_registration_id IN (
      SELECT id FROM event_registrations 
      WHERE user_id = auth.uid()
    )
  );

-- Allow the worker/system to insert notification logs
CREATE POLICY notification_logs_system_policy ON notification_logs
  FOR INSERT WITH CHECK (true);