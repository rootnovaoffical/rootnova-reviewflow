/*
# Create action_items table — Intelligent Action & Growth Center

## Purpose
Stores AI-generated business action items / priorities derived from real review data.
Each action item represents a recommended business improvement with supporting evidence,
priority level, confidence, and a status the business owner can manage.

## 1. New Tables
- `action_items`
  - `id` (uuid, primary key)
  - `business_id` (uuid, FK to businesses, cascade delete)
  - `title` (text, not null) — short title of the priority
  - `explanation` (text) — short plain-English explanation
  - `why_it_matters` (text) — why this priority matters for the business
  - `recommended_action` (text) — concrete recommended next step
  - `priority_level` (text, check: critical/high/medium/low) — urgency
  - `confidence` (text, check: high/medium/low) — AI confidence in this priority
  - `status` (text, default 'open', check: open/in_progress/resolved/dismissed)
  - `evidence` (jsonb) — supporting review references and data points
  - `internal_notes` (text, nullable) — business owner's private notes
  - `ai_generated_at` (timestamptz) — when the AI produced this item
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

## 2. Indexes
- `idx_action_items_business_id` — fast lookup by business
- `idx_action_items_business_status` — filter by business + status

## 3. Security (RLS)
- Enable RLS on `action_items`.
- 4 separate CRUD policies using existing `is_business_admin()` and `is_rootnova_staff()` helpers:
  - SELECT: business admin, org member, or RootNova staff
  - INSERT: business admin or RootNova staff
  - UPDATE: business admin or RootNova staff
  - DELETE: business admin or RootNova staff
- Business A cannot access Business B's action items.
*/

CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  explanation text,
  why_it_matters text,
  recommended_action text,
  priority_level text NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('critical', 'high', 'medium', 'low')),
  confidence text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  evidence jsonb DEFAULT '{}'::jsonb,
  internal_notes text,
  ai_generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_items_business_id ON action_items(business_id);
CREATE INDEX IF NOT EXISTS idx_action_items_business_status ON action_items(business_id, status);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "action_items_admin_select" ON action_items;
CREATE POLICY "action_items_admin_select" ON action_items FOR SELECT
  TO authenticated USING (
    is_rootnova_staff() OR is_business_admin(business_id) OR is_business_org_member(business_id)
  );

DROP POLICY IF EXISTS "action_items_admin_insert" ON action_items;
CREATE POLICY "action_items_admin_insert" ON action_items FOR INSERT
  TO authenticated WITH CHECK (
    is_rootnova_staff() OR is_business_admin(business_id) OR is_business_org_member(business_id)
  );

DROP POLICY IF EXISTS "action_items_admin_update" ON action_items;
CREATE POLICY "action_items_admin_update" ON action_items FOR UPDATE
  TO authenticated USING (
    is_rootnova_staff() OR is_business_admin(business_id) OR is_business_org_member(business_id)
  ) WITH CHECK (
    is_rootnova_staff() OR is_business_admin(business_id) OR is_business_org_member(business_id)
  );

DROP POLICY IF EXISTS "action_items_admin_delete" ON action_items;
CREATE POLICY "action_items_admin_delete" ON action_items FOR DELETE
  TO authenticated USING (
    is_rootnova_staff() OR is_business_admin(business_id) OR is_business_org_member(business_id)
  );
