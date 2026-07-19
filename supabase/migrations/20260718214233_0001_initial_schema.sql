/*
# RootNova ReviewFlow — Initial Schema

## Purpose
Multi-tenant SaaS that lets local businesses collect fast, anonymous customer
feedback via a QR code and turn it into one concise, AI-assisted review that the
customer can copy and paste onto the business's Google review page.

## New Tables
1. `profiles` — extends `auth.users` with a `role` (ROOTNOVA_ADMIN | BUSINESS_ADMIN).
2. `businesses` — a tenant business (name, slug, branding, Google review links).
3. `business_admins` — join table allowing many admins per business.
4. `questions` — multiple-choice questions (flow_type ALWAYS | POSITIVE | NEGATIVE).
5. `review_sessions` — one anonymous customer review submission + AI output.
6. `analytics_events` — funnel events (page viewed, rating selected, etc.).

## Security
- RLS enabled on every table.
- ROOTNOVA_ADMIN: full access to all rows (via `is_rootnova_admin()` helper).
- BUSINESS_ADMIN: access only to rows of businesses they administer (via
  `is_business_admin(business_id)` helper).
- Public (anon) customers: can READ only active+enabled businesses and their
  active questions; can INSERT review_sessions and analytics_events for active
  businesses. They can never list all businesses, read sessions, or read analytics.

## Helpers
- `is_rootnova_admin()` — true if caller's profile role is ROOTNOVA_ADMIN.
- `is_business_admin(business_id)` — true if caller is admin of that business.
- `claim_initial_admin(full_name)` — one-shot RPC used by the /setup page to
  promote the very first user to ROOTNOVA_ADMIN. Fails once any admin exists.
- `handle_new_user()` — trigger that creates a BUSINESS_ADMIN profile for every
  new auth.users row (business admins created by RootNova admin start here; the
  setup page then promotes the first one to ROOTNOVA_ADMIN).
- `set_updated_at()` — generic trigger to maintain `updated_at`.

## Seed
- One test business "Happy Hour Cafe" (slug `happy-hour-cafe`) with three
  questions (ALWAYS / POSITIVE / NEGATIVE), ONLY inserted if the table is empty.
*/

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Generic updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  email text,
  role text NOT NULL DEFAULT 'BUSINESS_ADMIN'
    CHECK (role IN ('ROOTNOVA_ADMIN','BUSINESS_ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- businesses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#6366f1',
  secondary_color text DEFAULT '#a855f7',
  welcome_message text DEFAULT 'We''d love to hear about your experience!',
  google_place_id text,
  google_maps_url text,
  google_review_url text NOT NULL,
  public_review_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS businesses_updated_at ON public.businesses;
CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- business_admins
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.business_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

ALTER TABLE public.business_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice')),
  flow_type text NOT NULL CHECK (flow_type IN ('ALWAYS','POSITIVE','NEGATIVE')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_business_id_idx ON public.questions(business_id);
CREATE INDEX IF NOT EXISTS questions_business_active_idx ON public.questions(business_id, is_active, sort_order);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS questions_updated_at ON public.questions;
CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- review_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_generated_review text,
  ai_status text NOT NULL DEFAULT 'pending'
    CHECK (ai_status IN ('pending','generating','completed','failed')),
  google_place_id_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS review_sessions_business_id_idx ON public.review_sessions(business_id);
CREATE INDEX IF NOT EXISTS review_sessions_created_at_idx ON public.review_sessions(created_at desc);

ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- analytics_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_business_id_idx ON public.analytics_events(business_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events(created_at desc);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper functions (tables now exist)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_rootnova_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'ROOTNOVA_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_admins ba
    WHERE ba.business_id = p_business_id AND ba.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- profiles policies
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_rootnova_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- businesses policies
-- ============================================================================
DROP POLICY IF EXISTS "businesses_public_read" ON public.businesses;
CREATE POLICY "businesses_public_read" ON public.businesses
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND public_review_enabled = true);

DROP POLICY IF EXISTS "businesses_admin_select" ON public.businesses;
CREATE POLICY "businesses_admin_select" ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_rootnova_admin() OR public.is_business_admin(id));

DROP POLICY IF EXISTS "businesses_admin_insert" ON public.businesses;
CREATE POLICY "businesses_admin_insert" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_rootnova_admin());

DROP POLICY IF EXISTS "businesses_admin_update" ON public.businesses;
CREATE POLICY "businesses_admin_update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.is_rootnova_admin() OR public.is_business_admin(id))
  WITH CHECK (public.is_rootnova_admin() OR public.is_business_admin(id));

DROP POLICY IF EXISTS "businesses_admin_delete" ON public.businesses;
CREATE POLICY "businesses_admin_delete" ON public.businesses
  FOR DELETE TO authenticated
  USING (public.is_rootnova_admin());

-- ============================================================================
-- business_admins policies
-- ============================================================================
DROP POLICY IF EXISTS "business_admins_admin_select" ON public.business_admins;
CREATE POLICY "business_admins_admin_select" ON public.business_admins
  FOR SELECT TO authenticated
  USING (public.is_rootnova_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "business_admins_admin_insert" ON public.business_admins;
CREATE POLICY "business_admins_admin_insert" ON public.business_admins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_rootnova_admin());

DROP POLICY IF EXISTS "business_admins_admin_delete" ON public.business_admins;
CREATE POLICY "business_admins_admin_delete" ON public.business_admins
  FOR DELETE TO authenticated
  USING (public.is_rootnova_admin());

-- ============================================================================
-- questions policies
-- ============================================================================
DROP POLICY IF EXISTS "questions_public_read" ON public.questions;
CREATE POLICY "questions_public_read" ON public.questions
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = questions.business_id
        AND b.status = 'active'
        AND b.public_review_enabled = true
    )
  );

DROP POLICY IF EXISTS "questions_admin_select" ON public.questions;
CREATE POLICY "questions_admin_select" ON public.questions
  FOR SELECT TO authenticated
  USING (public.is_rootnova_admin() OR public.is_business_admin(business_id));

DROP POLICY IF EXISTS "questions_admin_insert" ON public.questions;
CREATE POLICY "questions_admin_insert" ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_rootnova_admin() OR public.is_business_admin(business_id));

DROP POLICY IF EXISTS "questions_admin_update" ON public.questions;
CREATE POLICY "questions_admin_update" ON public.questions
  FOR UPDATE TO authenticated
  USING (public.is_rootnova_admin() OR public.is_business_admin(business_id))
  WITH CHECK (public.is_rootnova_admin() OR public.is_business_admin(business_id));

DROP POLICY IF EXISTS "questions_admin_delete" ON public.questions;
CREATE POLICY "questions_admin_delete" ON public.questions
  FOR DELETE TO authenticated
  USING (public.is_rootnova_admin() OR public.is_business_admin(business_id));

-- ============================================================================
-- review_sessions policies
-- ============================================================================
DROP POLICY IF EXISTS "review_sessions_public_insert" ON public.review_sessions;
CREATE POLICY "review_sessions_public_insert" ON public.review_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = review_sessions.business_id
        AND b.status = 'active'
        AND b.public_review_enabled = true
    )
  );

DROP POLICY IF EXISTS "review_sessions_admin_select" ON public.review_sessions;
CREATE POLICY "review_sessions_admin_select" ON public.review_sessions
  FOR SELECT TO authenticated
  USING (public.is_rootnova_admin() OR public.is_business_admin(business_id));

-- ============================================================================
-- analytics_events policies
-- ============================================================================
DROP POLICY IF EXISTS "analytics_events_public_insert" ON public.analytics_events;
CREATE POLICY "analytics_events_public_insert" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    business_id IS NULL OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = analytics_events.business_id
        AND b.status = 'active'
    )
  );

DROP POLICY IF EXISTS "analytics_events_admin_select" ON public.analytics_events;
CREATE POLICY "analytics_events_admin_select" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.is_rootnova_admin() OR public.is_business_admin(business_id));

-- ============================================================================
-- Auth trigger: create a default profile for every new auth user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'BUSINESS_ADMIN'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- One-shot setup: promote the first user to ROOTNOVA_ADMIN
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_initial_admin(p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'ROOTNOVA_ADMIN';
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'A RootNova admin already exists';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles
    SET role = 'ROOTNOVA_ADMIN', full_name = COALESCE(NULLIF(p_full_name, ''), full_name)
    WHERE id = auth.uid();
END;
$$;

-- ============================================================================
-- Seed: Happy Hour Cafe (only if businesses table is empty)
-- ============================================================================
DO $$
DECLARE
  biz_count integer;
  biz_id uuid;
BEGIN
  SELECT count(*) INTO biz_count FROM public.businesses;
  IF biz_count > 0 THEN RETURN; END IF;

  INSERT INTO public.businesses (
    name, slug, welcome_message, google_review_url, google_maps_url,
    primary_color, secondary_color, status, public_review_enabled
  ) VALUES (
    'Happy Hour Cafe',
    'happy-hour-cafe',
    'We''d love to hear about your experience!',
    'https://www.google.com/search?q=Happy+Hour+Cafe',
    'https://www.google.com/search?q=Happy+Hour+Cafe',
    '#6366f1',
    '#a855f7',
    'active',
    true
  )
  RETURNING id INTO biz_id;

  INSERT INTO public.questions (business_id, question_text, flow_type, options, sort_order) VALUES
    (biz_id, 'How did you hear about us?', 'ALWAYS',
      '["📱 Instagram","🔍 Google","👥 Friend or family","🚶 Walk-in","🔁 Returning customer"]'::jsonb, 0),
    (biz_id, 'What did you enjoy most?', 'POSITIVE',
      '["🍽️ Food","😊 Staff","🎶 Ambience","🍹 Drinks","✨ Overall experience"]'::jsonb, 1),
    (biz_id, 'What could we improve?', 'NEGATIVE',
      '["🍽️ Food","😊 Staff","🎶 Ambience","🍹 Drinks","⏱️ Waiting time","💰 Pricing","✨ Overall experience"]'::jsonb, 2);
END $$;
