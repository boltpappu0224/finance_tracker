/*
  # Add Missing Core Tables for Complete Finance Tracker

  ## Overview
  Adds notifications_log, chat_messages, family_members, user_devices, badges, and export_logs tables
  to complete the core feature set for the AI-powered finance budget tracker.

  ## New Tables
  1. notifications_log - Stores all notifications sent to users (for history and deduplication)
  2. chat_messages - Persists AI advisor conversation history
  3. family_members - Manages family group memberships and permissions
  4. user_devices - Tracks user's devices for multi-device sync and security
  5. badges - Gamification: achievement badges earned by users
  6. user_badges - Junction table linking users to earned badges
  7. export_logs - Tracks PDF/Excel export requests

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
  - Family members see shared family data
*/

-- Create notifications_log table
CREATE TABLE IF NOT EXISTS notifications_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  loan_id uuid REFERENCES loans(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('budget_alert', 'subscription_reminder', 'emi_reminder', 'anomaly_alert', 'salary_alert', 'goal_milestone', 'achievement', 'other')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  channels text[] DEFAULT ARRAY['in_app'],
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark notifications as read"
  ON notifications_log FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications_log(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications_log(created_at DESC);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context jsonb DEFAULT '{}',
  tokens_used integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own chat messages"
  ON chat_messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_user_date ON chat_messages(user_id, created_at DESC);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member', 'child', 'viewer')) DEFAULT 'member',
  permissions text[] DEFAULT ARRAY['view_transactions'],
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(family_id, user_id)
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view their family"
  ON family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family admins can manage family"
  ON family_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- Create user_devices table
CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_name text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('web', 'mobile_ios', 'mobile_android', 'tablet')),
  user_agent text,
  ip_address text,
  is_active boolean DEFAULT true,
  is_trusted boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON user_devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own devices"
  ON user_devices FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen DESC);

-- Create badges table (system-wide achievements)
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  category text NOT NULL CHECK (category IN ('saving', 'tracking', 'milestone', 'consistency', 'achievement')),
  requirement_type text NOT NULL CHECK (requirement_type IN ('transaction_count', 'days_streak', 'savings_amount', 'goal_completed', 'investment_made')),
  requirement_value numeric(15, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  TO authenticated
  USING (true);

-- Create user_badges table (earned badges by users)
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view others earned badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned ON user_badges(earned_at DESC);

-- Create export_logs table
CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  export_type text NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv', 'email')),
  format text,
  date_range_start date,
  date_range_end date,
  file_size_bytes integer,
  download_url text,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
  ON export_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create exports"
  ON export_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_export_logs_user ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_status ON export_logs(status);

-- Insert default badges
INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value) VALUES
('First Transaction', 'Record your first transaction', '🎯', 'achievement', 'transaction_count', 1),
('Tracker Pro', 'Record 50 transactions', '📊', 'tracking', 'transaction_count', 50),
('Budget Master', 'Stay within budget for 3 months', '💰', 'achievement', 'days_streak', 90),
('Saver', 'Save ₹10,000', '🏦', 'saving', 'savings_amount', 10000),
('7-Day Streak', 'Track expenses for 7 consecutive days', '🔥', 'consistency', 'days_streak', 7),
('30-Day Streak', 'Track expenses for 30 consecutive days', '🔥', 'consistency', 'days_streak', 30),
('Goal Getter', 'Complete a savings goal', '🎉', 'milestone', 'goal_completed', 1),
('Investor', 'Add your first investment', '📈', 'achievement', 'investment_made', 1)
ON CONFLICT (name) DO NOTHING;
