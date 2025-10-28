-- ========================================
-- Migration: Create notifications support tables
-- Description: Adds notification_type enum, notifications table, and user notification preferences table
-- ========================================

CREATE TYPE notification_type AS ENUM (
  'application_status_change',
  'new_message',
  'payment_received',
  'offer_approved',
  'offer_rejected',
  'new_application',
  'review_received',
  'system_announcement',
  'registration_approved',
  'registration_rejected',
  'work_completion_approval',
  'priority_listing_expiring'
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title varchar(200) NOT NULL,
  message text NOT NULL,
  link_url varchar(255),
  metadata jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp,
  created_at timestamp DEFAULT NOW()
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS link_url varchar(255),
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamp,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  in_app_notifications boolean NOT NULL DEFAULT true,
  email_application_status boolean NOT NULL DEFAULT true,
  email_new_message boolean NOT NULL DEFAULT true,
  email_payment boolean NOT NULL DEFAULT true,
  email_offer boolean NOT NULL DEFAULT true,
  email_review boolean NOT NULL DEFAULT true,
  email_system boolean NOT NULL DEFAULT true,
  push_application_status boolean NOT NULL DEFAULT true,
  push_new_message boolean NOT NULL DEFAULT true,
  push_payment boolean NOT NULL DEFAULT true,
  push_subscription jsonb,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS push_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_application_status boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_new_message boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_payment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_offer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_review boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_system boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_application_status boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_new_message boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_payment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_subscription jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();
-- ========================================
-- Migration complete
-- ========================================
