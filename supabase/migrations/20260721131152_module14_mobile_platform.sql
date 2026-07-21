/*
# Module 14 — Business Mobile Platform

## Summary
Adds mobile device registration, push notification infrastructure, and a unified
notification center for the ReviewFlow business mobile application.

## New Tables
1. `mobile_devices` — Tracks registered mobile devices for push notifications.
   - `id` (uuid PK)
   - `user_id` (uuid, references auth.users, NOT NULL DEFAULT auth.uid())
   - `device_token` (text, unique, NOT NULL) — FCM/APNs push token
   - `platform` (text: 'ios' | 'android' | 'web') — device OS
   - `device_name` (text) — user-friendly device label
   - `app_version` (text) — installed app version
   - `is_active` (boolean, default true)
   - `last_seen_at` (timestamptz)
   - `created_at` / `updated_at`

2. `push_notifications` — Stores push notification messages sent to devices.
   - `id` (uuid PK)
   - `user_id` (uuid, references auth.users, NOT NULL DEFAULT auth.uid())
   - `device_id` (uuid, references mobile_devices, nullable)
   - `notification_type` (text NOT NULL) — e.g. 'review', 'ai', 'campaign', 'enterprise', 'security'
   - `title` (text NOT NULL)
   - `body` (text NOT NULL)
   - `data` (jsonb) — payload for deep linking
   - `priority` (text: 'low' | 'normal' | 'high', default 'normal')
   - `status` (text: 'pending' | 'sent' | 'delivered' | 'failed', default 'pending')
   - `sent_at`, `delivered_at`, `failed_at` (timestamptz, nullable)
   - `created_at` / `updated_at`

3. `mobile_notification_center` — Unified in-app notification center for mobile.
   - `id` (uuid PK)
   - `user_id` (uuid, references auth.users, NOT NULL DEFAULT auth.uid())
   - `business_id` (uuid, references businesses, nullable)
   - `category` (text NOT NULL) — 'ai' | 'reviews' | 'campaigns' | 'customers' | 'enterprise' | 'platform' | 'security'
   - `title` (text NOT NULL)
   - `message` (text NOT NULL)
   - `severity` (text: 'info' | 'warning' | 'critical' | 'positive', default 'info')
   - `related_id` (uuid, nullable)
   - `related_type` (text, nullable)
   - `is_read` (boolean, default false)
   - `read_at` (timestamptz, nullable)
   - `action_url` (text, nullable) — deep link for mobile navigation
   - `created_at`

## Security (RLS)
- All tables have RLS enabled.
- Owner-scoped CRUD policies for `mobile_devices`, `push_notifications`, and `mobile_notification_center`.
- All policies use `auth.uid()` and target `authenticated` users only.

## Notes
1. Tables are additive — no existing tables modified.
2. All owner columns default to `auth.uid()` so inserts work without explicit user_id.
3. Indexes added on user_id and device_token for query performance.
*/

-- ============================================================
-- mobile_devices
-- ============================================================
CREATE TABLE IF NOT EXISTS mobile_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token text UNIQUE NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  device_name text,
  app_version text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mobile_devices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mobile_devices_user_id ON mobile_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_token ON mobile_devices(device_token);

DROP POLICY IF EXISTS "select_own_devices" ON mobile_devices;
CREATE POLICY "select_own_devices" ON mobile_devices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_devices" ON mobile_devices;
CREATE POLICY "insert_own_devices" ON mobile_devices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_devices" ON mobile_devices;
CREATE POLICY "update_own_devices" ON mobile_devices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_devices" ON mobile_devices;
CREATE POLICY "delete_own_devices" ON mobile_devices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- push_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES mobile_devices(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);

DROP POLICY IF EXISTS "select_own_push_notifications" ON push_notifications;
CREATE POLICY "select_own_push_notifications" ON push_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_push_notifications" ON push_notifications;
CREATE POLICY "insert_own_push_notifications" ON push_notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_push_notifications" ON push_notifications;
CREATE POLICY "update_own_push_notifications" ON push_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_push_notifications" ON push_notifications;
CREATE POLICY "delete_own_push_notifications" ON push_notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- mobile_notification_center
-- ============================================================
CREATE TABLE IF NOT EXISTS mobile_notification_center (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  related_id uuid,
  related_type text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  action_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mobile_notification_center ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mobile_notifications_user_id ON mobile_notification_center(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_notifications_unread ON mobile_notification_center(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_mobile_notifications_category ON mobile_notification_center(category);

DROP POLICY IF EXISTS "select_own_mobile_notifications" ON mobile_notification_center;
CREATE POLICY "select_own_mobile_notifications" ON mobile_notification_center FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_mobile_notifications" ON mobile_notification_center;
CREATE POLICY "insert_own_mobile_notifications" ON mobile_notification_center FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_mobile_notifications" ON mobile_notification_center;
CREATE POLICY "update_own_mobile_notifications" ON mobile_notification_center FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_mobile_notifications" ON mobile_notification_center;
CREATE POLICY "delete_own_mobile_notifications" ON mobile_notification_center FOR DELETE
  TO authenticated USING (auth.uid() = user_id);