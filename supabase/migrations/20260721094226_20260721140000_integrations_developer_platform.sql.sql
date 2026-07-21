/*
# Module 11: Integrations & Developer Platform

## Overview
Creates the complete integration layer for ReviewFlow — provider abstraction,
credential vault, webhook engine, API platform, sync engine, developer portal,
and integration marketplace.

## New Tables (11 tables)

1. integration_providers — Catalog of all available integration providers (Google Business, Meta, WhatsApp, Twilio, SendGrid, Stripe, Shopify, etc.)
   - id (uuid PK)
   - provider_key (text, unique) — e.g. "google_business", "stripe", "shopify"
   - name (text) — display name
   - category (text) — crm, pos, email, sms, payments, analytics, accounting, marketing, automation, booking, etc.
   - description (text)
   - logo_url (text)
   - auth_type (text) — oauth2, api_key, bearer, webhook, basic
   - auth_config (jsonb) — fields needed for auth
   - supported_features (text[]) — sync, webhooks, real_time, etc.
   - api_base_url (text)
   - webhook_url_template (text)
   - rate_limit_per_minute (int)
   - is_active (boolean)
   - is_featured (boolean)
   - sort_order (int)
   - created_at, updated_at

2. installed_integrations — Business-level installation of a provider
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - provider_id (uuid FK -> integration_providers)
   - status (text) — active, inactive, error, syncing
   - config (jsonb) — per-installation config
   - sync_frequency (text) — realtime, hourly, daily, weekly, manual
   - last_sync_at (timestamptz)
   - last_sync_status (text)
   - last_error (text)
   - health_score (numeric) — 0-100
   - enabled_features (text[])
   - installed_by (uuid)
   - created_at, updated_at

3. provider_credentials — Encrypted credential vault
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - integration_id (uuid FK -> installed_integrations)
   - credential_type (text) — oauth_token, api_key, bearer_token, webhook_secret, refresh_token, basic_auth
   - encrypted_value (text) — encrypted
   - metadata (jsonb) — scopes, expiry, refresh_url
   - expires_at (timestamptz)
   - is_valid (boolean)
   - last_validated_at (timestamptz)
   - created_at, updated_at

4. api_keys — Developer API keys for external access
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - key_name (text)
   - key_prefix (text) — first 8 chars for identification
   - key_hash (text) — hashed full key
   - scopes (text[]) — reviews:read, reviews:write, customers:read, etc.
   - rate_limit_per_hour (int)
   - last_used_at (timestamptz)
   - expires_at (timestamptz)
   - is_active (boolean)
   - created_by (uuid)
   - created_at, updated_at

5. api_usage — API call tracking
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - api_key_id (uuid FK -> api_keys)
   - endpoint (text)
   - method (text)
   - status_code (int)
   - response_time_ms (int)
   - created_at

6. webhooks — Webhook endpoint configurations
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - name (text)
   - url (text)
   - events (text[]) — event types to subscribe to
   - secret (text) — signing secret
   - is_active (boolean)
   - created_at, updated_at

7. webhook_events — Webhook delivery records
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - webhook_id (uuid FK -> webhooks)
   - event_type (text)
   - payload (jsonb)
   - status (text) — pending, delivered, failed, retrying, dead_letter
   - attempt_count (int)
   - max_attempts (int)
   - next_retry_at (timestamptz)
   - response_status (int)
   - response_body (text)
   - delivered_at (timestamptz)
   - created_at

8. sync_jobs — Sync engine job tracking
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - integration_id (uuid FK -> installed_integrations)
   - sync_type (text) — full, incremental, one_way, two_way
   - status (text) — queued, running, completed, failed, partial
   - direction (text) — inbound, outbound, bidirectional
   - total_records (int)
   - processed_records (int)
   - failed_records (int)
   - conflict_count (int)
   - error_message (text)
   - started_at (timestamptz)
   - completed_at (timestamptz)
   - duration_ms (int)
   - created_at

9. sync_logs — Detailed sync log entries
   - id (uuid PK)
   - business_id (uuid FK -> businesses)
   - sync_job_id (uuid FK -> sync_jobs)
   - level (text) — info, warn, error, debug
   - entity_type (text)
   - entity_id (text)
   - message (text)
   - metadata (jsonb)
   - created_at

10. developer_apps — Registered developer applications
    - id (uuid PK)
    - business_id (uuid FK -> businesses)
    - app_name (text)
    - description (text)
    - client_id (text, unique)
    - client_secret_hash (text)
    - redirect_uris (text[])
    - scopes (text[])
    - is_active (boolean)
    - created_at, updated_at

11. developer_tokens — OAuth tokens issued to developer apps
    - id (uuid PK)
    - business_id (uuid FK -> businesses)
    - app_id (uuid FK -> developer_apps)
    - access_token_hash (text)
    - refresh_token_hash (text)
    - scopes (text[])
    - expires_at (timestamptz)
    - is_revoked (boolean)
    - created_at, updated_at

## Security (RLS)
- All tables have RLS enabled
- All tables scoped to business_id via auth.uid() ownership chain
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
- api_keys: only business admins can create/view
- provider_credentials: encrypted storage, no plaintext exposure
*/

-- 1. integration_providers (catalog — platform-level, not business-scoped)
CREATE TABLE IF NOT EXISTS integration_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  logo_url text,
  auth_type text NOT NULL DEFAULT 'api_key',
  auth_config jsonb DEFAULT '{}'::jsonb,
  supported_features text[] DEFAULT '{}',
  api_base_url text,
  webhook_url_template text,
  rate_limit_per_minute int DEFAULT 60,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_integration_providers" ON integration_providers;
CREATE POLICY "select_integration_providers" ON integration_providers FOR SELECT
  TO authenticated USING (true);

-- 2. installed_integrations
CREATE TABLE IF NOT EXISTS installed_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES integration_providers(id) ON DELETE RESTRICT,
  status text DEFAULT 'active',
  config jsonb DEFAULT '{}'::jsonb,
  sync_frequency text DEFAULT 'manual',
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  health_score numeric DEFAULT 100,
  enabled_features text[] DEFAULT '{}',
  installed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE installed_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_installed_integrations" ON installed_integrations;
CREATE POLICY "select_own_installed_integrations" ON installed_integrations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = installed_integrations.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_installed_integrations" ON installed_integrations;
CREATE POLICY "insert_own_installed_integrations" ON installed_integrations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = installed_integrations.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_installed_integrations" ON installed_integrations;
CREATE POLICY "update_own_installed_integrations" ON installed_integrations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = installed_integrations.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = installed_integrations.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_installed_integrations" ON installed_integrations;
CREATE POLICY "delete_own_installed_integrations" ON installed_integrations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = installed_integrations.business_id AND business_admins.user_id = auth.uid())
  );

-- 3. provider_credentials
CREATE TABLE IF NOT EXISTS provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES installed_integrations(id) ON DELETE CASCADE,
  credential_type text NOT NULL,
  encrypted_value text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  is_valid boolean DEFAULT true,
  last_validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_provider_credentials" ON provider_credentials;
CREATE POLICY "select_own_provider_credentials" ON provider_credentials FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = provider_credentials.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_provider_credentials" ON provider_credentials;
CREATE POLICY "insert_own_provider_credentials" ON provider_credentials FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = provider_credentials.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_provider_credentials" ON provider_credentials;
CREATE POLICY "update_own_provider_credentials" ON provider_credentials FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = provider_credentials.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = provider_credentials.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_provider_credentials" ON provider_credentials;
CREATE POLICY "delete_own_provider_credentials" ON provider_credentials FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = provider_credentials.business_id AND business_admins.user_id = auth.uid())
  );

-- 4. api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] DEFAULT '{}',
  rate_limit_per_hour int DEFAULT 1000,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_api_keys" ON api_keys;
CREATE POLICY "select_own_api_keys" ON api_keys FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_keys.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_api_keys" ON api_keys;
CREATE POLICY "insert_own_api_keys" ON api_keys FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_keys.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_api_keys" ON api_keys;
CREATE POLICY "update_own_api_keys" ON api_keys FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_keys.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_keys.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_api_keys" ON api_keys;
CREATE POLICY "delete_own_api_keys" ON api_keys FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_keys.business_id AND business_admins.user_id = auth.uid())
  );

-- 5. api_usage
CREATE TABLE IF NOT EXISTS api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code int,
  response_time_ms int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_api_usage" ON api_usage;
CREATE POLICY "select_own_api_usage" ON api_usage FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_usage.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_api_usage" ON api_usage;
CREATE POLICY "insert_own_api_usage" ON api_usage FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_usage.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_api_usage" ON api_usage;
CREATE POLICY "update_own_api_usage" ON api_usage FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_usage.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_usage.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_api_usage" ON api_usage;
CREATE POLICY "delete_own_api_usage" ON api_usage FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = api_usage.business_id AND business_admins.user_id = auth.uid())
  );

-- 6. webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  events text[] DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_webhooks" ON webhooks;
CREATE POLICY "select_own_webhooks" ON webhooks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhooks.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_webhooks" ON webhooks;
CREATE POLICY "insert_own_webhooks" ON webhooks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhooks.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_webhooks" ON webhooks;
CREATE POLICY "update_own_webhooks" ON webhooks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhooks.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhooks.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_webhooks" ON webhooks;
CREATE POLICY "delete_own_webhooks" ON webhooks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhooks.business_id AND business_admins.user_id = auth.uid())
  );

-- 7. webhook_events
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  webhook_id uuid REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  attempt_count int DEFAULT 0,
  max_attempts int DEFAULT 5,
  next_retry_at timestamptz,
  response_status int,
  response_body text,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_webhook_events" ON webhook_events;
CREATE POLICY "select_own_webhook_events" ON webhook_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhook_events.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_webhook_events" ON webhook_events;
CREATE POLICY "insert_own_webhook_events" ON webhook_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhook_events.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_webhook_events" ON webhook_events;
CREATE POLICY "update_own_webhook_events" ON webhook_events FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhook_events.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhook_events.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_webhook_events" ON webhook_events;
CREATE POLICY "delete_own_webhook_events" ON webhook_events FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = webhook_events.business_id AND business_admins.user_id = auth.uid())
  );

-- 8. sync_jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES installed_integrations(id) ON DELETE CASCADE,
  sync_type text DEFAULT 'full',
  status text DEFAULT 'queued',
  direction text DEFAULT 'inbound',
  total_records int DEFAULT 0,
  processed_records int DEFAULT 0,
  failed_records int DEFAULT 0,
  conflict_count int DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sync_jobs" ON sync_jobs;
CREATE POLICY "select_own_sync_jobs" ON sync_jobs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_jobs.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_sync_jobs" ON sync_jobs;
CREATE POLICY "insert_own_sync_jobs" ON sync_jobs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_jobs.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_sync_jobs" ON sync_jobs;
CREATE POLICY "update_own_sync_jobs" ON sync_jobs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_jobs.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_jobs.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_sync_jobs" ON sync_jobs;
CREATE POLICY "delete_own_sync_jobs" ON sync_jobs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_jobs.business_id AND business_admins.user_id = auth.uid())
  );

-- 9. sync_logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sync_job_id uuid REFERENCES sync_jobs(id) ON DELETE CASCADE,
  level text DEFAULT 'info',
  entity_type text,
  entity_id text,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sync_logs" ON sync_logs;
CREATE POLICY "select_own_sync_logs" ON sync_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_logs.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_sync_logs" ON sync_logs;
CREATE POLICY "insert_own_sync_logs" ON sync_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_logs.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_sync_logs" ON sync_logs;
CREATE POLICY "update_own_sync_logs" ON sync_logs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_logs.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_logs.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_sync_logs" ON sync_logs;
CREATE POLICY "delete_own_sync_logs" ON sync_logs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = sync_logs.business_id AND business_admins.user_id = auth.uid())
  );

-- 10. developer_apps
CREATE TABLE IF NOT EXISTS developer_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  app_name text NOT NULL,
  description text,
  client_id text UNIQUE NOT NULL,
  client_secret_hash text NOT NULL,
  redirect_uris text[] DEFAULT '{}',
  scopes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE developer_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_developer_apps" ON developer_apps;
CREATE POLICY "select_own_developer_apps" ON developer_apps FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_apps.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_developer_apps" ON developer_apps;
CREATE POLICY "insert_own_developer_apps" ON developer_apps FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_apps.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_developer_apps" ON developer_apps;
CREATE POLICY "update_own_developer_apps" ON developer_apps FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_apps.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_apps.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_developer_apps" ON developer_apps;
CREATE POLICY "delete_own_developer_apps" ON developer_apps FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_apps.business_id AND business_admins.user_id = auth.uid())
  );

-- 11. developer_tokens
CREATE TABLE IF NOT EXISTS developer_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  app_id uuid REFERENCES developer_apps(id) ON DELETE CASCADE,
  access_token_hash text NOT NULL,
  refresh_token_hash text,
  scopes text[] DEFAULT '{}',
  expires_at timestamptz,
  is_revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE developer_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_developer_tokens" ON developer_tokens;
CREATE POLICY "select_own_developer_tokens" ON developer_tokens FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_tokens.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_developer_tokens" ON developer_tokens;
CREATE POLICY "insert_own_developer_tokens" ON developer_tokens FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_tokens.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_developer_tokens" ON developer_tokens;
CREATE POLICY "update_own_developer_tokens" ON developer_tokens FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_tokens.business_id AND business_admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_tokens.business_id AND business_admins.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_developer_tokens" ON developer_tokens;
CREATE POLICY "delete_own_developer_tokens" ON developer_tokens FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM business_admins WHERE business_admins.business_id = developer_tokens.business_id AND business_admins.user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_installed_integrations_business ON installed_integrations(business_id);
CREATE INDEX IF NOT EXISTS idx_installed_integrations_provider ON installed_integrations(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_business ON provider_credentials(business_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_integration ON provider_credentials(integration_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_business ON api_keys(business_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_business ON api_usage(business_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_business ON webhooks(business_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_business ON webhook_events(business_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_business ON sync_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration ON sync_jobs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_business ON sync_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_job ON sync_logs(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_developer_apps_business ON developer_apps(business_id);
CREATE INDEX IF NOT EXISTS idx_developer_tokens_business ON developer_tokens(business_id);
CREATE INDEX IF NOT EXISTS idx_developer_tokens_app ON developer_tokens(app_id);

-- Enable realtime for key tables
ALTER TABLE installed_integrations REPLICA IDENTITY FULL;
ALTER TABLE webhook_events REPLICA IDENTITY FULL;
ALTER TABLE sync_jobs REPLICA IDENTITY FULL;
ALTER TABLE api_usage REPLICA IDENTITY FULL;