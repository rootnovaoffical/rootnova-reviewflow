/*
# Module 13 — Multi-Location Enterprise Platform (retry)

Fixes the syntax error from the previous attempt: `ALTER PUBLICATION ... ADD TABLE IF EXISTS`
is not valid syntax. Using `ALTER PUBLICATION ... ADD TABLE` wrapped in a DO block
that checks if the table is already in the publication.

All table creation statements are idempotent (IF NOT EXISTS) and will not
re-create tables that already succeeded in the previous partial run.
*/

-- ============================================================
-- 1. enterprise_regions
-- ============================================================

CREATE TABLE IF NOT EXISTS enterprise_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES enterprise_regions(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  region_type text NOT NULL DEFAULT 'region'
    CHECK (region_type IN ('region','zone','territory','country','state','city','area','district')),
  code text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_regions_org ON enterprise_regions(organization_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_regions_parent ON enterprise_regions(parent_id);

ALTER TABLE enterprise_regions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_enterprise_admin(org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND status = 'active'
    AND role IN ('ENTERPRISE_ADMIN','ORGANIZATION_ADMIN')
  );
$$;

DROP POLICY IF EXISTS "select_enterprise_regions" ON enterprise_regions;
CREATE POLICY "select_enterprise_regions" ON enterprise_regions FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_enterprise_regions" ON enterprise_regions;
CREATE POLICY "insert_enterprise_regions" ON enterprise_regions FOR INSERT
  TO authenticated WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "update_enterprise_regions" ON enterprise_regions;
CREATE POLICY "update_enterprise_regions" ON enterprise_regions FOR UPDATE
  TO authenticated USING (is_enterprise_admin(organization_id))
  WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "delete_enterprise_regions" ON enterprise_regions;
CREATE POLICY "delete_enterprise_regions" ON enterprise_regions FOR DELETE
  TO authenticated USING (is_enterprise_admin(organization_id));

-- ============================================================
-- 2. enterprise_branches
-- ============================================================

CREATE TABLE IF NOT EXISTS enterprise_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region_id uuid REFERENCES enterprise_regions(id) ON DELETE SET NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  branch_code text,
  branch_type text NOT NULL DEFAULT 'store'
    CHECK (branch_type IN ('head_office','store','franchise','kiosk','warehouse','pop_up')),
  address text,
  city text,
  state text,
  country text,
  timezone text DEFAULT 'UTC',
  currency text DEFAULT 'USD',
  language text DEFAULT 'en',
  phone text,
  email text,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','maintenance','suspended','onboarding')),
  health_score numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_branches_org ON enterprise_branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_branches_region ON enterprise_branches(region_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_branches_business ON enterprise_branches(business_id);

ALTER TABLE enterprise_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_enterprise_branches" ON enterprise_branches;
CREATE POLICY "select_enterprise_branches" ON enterprise_branches FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_enterprise_branches" ON enterprise_branches;
CREATE POLICY "insert_enterprise_branches" ON enterprise_branches FOR INSERT
  TO authenticated WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "update_enterprise_branches" ON enterprise_branches;
CREATE POLICY "update_enterprise_branches" ON enterprise_branches FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_enterprise_branches" ON enterprise_branches;
CREATE POLICY "delete_enterprise_branches" ON enterprise_branches FOR DELETE
  TO authenticated USING (is_enterprise_admin(organization_id));

-- ============================================================
-- 3. enterprise_branch_managers
-- ============================================================

CREATE TABLE IF NOT EXISTS enterprise_branch_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES enterprise_branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_role text NOT NULL DEFAULT 'BRANCH_MANAGER'
    CHECK (enterprise_role IN (
      'ENTERPRISE_ADMIN','ORGANIZATION_ADMIN','REGIONAL_DIRECTOR',
      'REGIONAL_MANAGER','AREA_MANAGER','BRANCH_MANAGER',
      'DEPARTMENT_MANAGER','SUPERVISOR','EMPLOYEE','READ_ONLY_AUDITOR'
    )),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (branch_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_managers_branch ON enterprise_branch_managers(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_managers_user ON enterprise_branch_managers(user_id);

ALTER TABLE enterprise_branch_managers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_access_branch(branch_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM enterprise_branches eb
    WHERE eb.id = branch_id
    AND is_org_member(eb.organization_id)
  );
$$;

DROP POLICY IF EXISTS "select_branch_managers" ON enterprise_branch_managers;
CREATE POLICY "select_branch_managers" ON enterprise_branch_managers FOR SELECT
  TO authenticated USING (can_access_branch(branch_id));

DROP POLICY IF EXISTS "insert_branch_managers" ON enterprise_branch_managers;
CREATE POLICY "insert_branch_managers" ON enterprise_branch_managers FOR INSERT
  TO authenticated WITH CHECK (can_access_branch(branch_id));

DROP POLICY IF EXISTS "update_branch_managers" ON enterprise_branch_managers;
CREATE POLICY "update_branch_managers" ON enterprise_branch_managers FOR UPDATE
  TO authenticated USING (can_access_branch(branch_id))
  WITH CHECK (can_access_branch(branch_id));

DROP POLICY IF EXISTS "delete_branch_managers" ON enterprise_branch_managers;
CREATE POLICY "delete_branch_managers" ON enterprise_branch_managers FOR DELETE
  TO authenticated USING (can_access_branch(branch_id));

-- ============================================================
-- 4. enterprise_roles
-- ============================================================

CREATE TABLE IF NOT EXISTS enterprise_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_role text NOT NULL DEFAULT 'EMPLOYEE'
    CHECK (enterprise_role IN (
      'ENTERPRISE_ADMIN','ORGANIZATION_ADMIN','REGIONAL_DIRECTOR',
      'REGIONAL_MANAGER','AREA_MANAGER','BRANCH_MANAGER',
      'DEPARTMENT_MANAGER','SUPERVISOR','EMPLOYEE','READ_ONLY_AUDITOR'
    )),
  scope_type text NOT NULL DEFAULT 'organization'
    CHECK (scope_type IN ('organization','region','branch')),
  scope_id uuid,
  permissions jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_roles_org ON enterprise_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_roles_user ON enterprise_roles(user_id);

ALTER TABLE enterprise_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_enterprise_roles" ON enterprise_roles;
CREATE POLICY "select_enterprise_roles" ON enterprise_roles FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_enterprise_roles" ON enterprise_roles;
CREATE POLICY "insert_enterprise_roles" ON enterprise_roles FOR INSERT
  TO authenticated WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "update_enterprise_roles" ON enterprise_roles;
CREATE POLICY "update_enterprise_roles" ON enterprise_roles FOR UPDATE
  TO authenticated USING (is_enterprise_admin(organization_id))
  WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "delete_enterprise_roles" ON enterprise_roles;
CREATE POLICY "delete_enterprise_roles" ON enterprise_roles FOR DELETE
  TO authenticated USING (is_enterprise_admin(organization_id));

-- ============================================================
-- 5. organization_policies
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region_id uuid REFERENCES enterprise_regions(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES enterprise_branches(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  policy_type text NOT NULL DEFAULT 'operational'
    CHECK (policy_type IN ('branding','operational','compliance','approval','communication','marketing','ai','integration')),
  name text NOT NULL,
  description text,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_inherited boolean NOT NULL DEFAULT true,
  is_overridable boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','draft')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_policies_org ON organization_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_policies_region ON organization_policies(region_id);
CREATE INDEX IF NOT EXISTS idx_org_policies_branch ON organization_policies(branch_id);

ALTER TABLE organization_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_policies" ON organization_policies;
CREATE POLICY "select_org_policies" ON organization_policies FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_policies" ON organization_policies;
CREATE POLICY "insert_org_policies" ON organization_policies FOR INSERT
  TO authenticated WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "update_org_policies" ON organization_policies;
CREATE POLICY "update_org_policies" ON organization_policies FOR UPDATE
  TO authenticated USING (is_enterprise_admin(organization_id))
  WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "delete_org_policies" ON organization_policies;
CREATE POLICY "delete_org_policies" ON organization_policies FOR DELETE
  TO authenticated USING (is_enterprise_admin(organization_id));

-- ============================================================
-- 6. enterprise_events
-- ============================================================

CREATE TABLE IF NOT EXISTS enterprise_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region_id uuid REFERENCES enterprise_regions(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES enterprise_branches(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_category text NOT NULL DEFAULT 'operational'
    CHECK (event_category IN ('branch','manager','policy','campaign','performance','review','risk','compliance','system')),
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical','positive')),
  title text NOT NULL,
  description text,
  event_data jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_events_org ON enterprise_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_events_type ON enterprise_events(event_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_events_branch ON enterprise_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_events_created ON enterprise_events(created_at DESC);

ALTER TABLE enterprise_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_enterprise_events" ON enterprise_events;
CREATE POLICY "select_enterprise_events" ON enterprise_events FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_enterprise_events" ON enterprise_events;
CREATE POLICY "insert_enterprise_events" ON enterprise_events FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_enterprise_events" ON enterprise_events;
CREATE POLICY "update_enterprise_events" ON enterprise_events FOR UPDATE
  TO authenticated USING (is_enterprise_admin(organization_id))
  WITH CHECK (is_enterprise_admin(organization_id));

DROP POLICY IF EXISTS "delete_enterprise_events" ON enterprise_events;
CREATE POLICY "delete_enterprise_events" ON enterprise_events FOR DELETE
  TO authenticated USING (is_enterprise_admin(organization_id));

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enterprise_regions_updated') THEN
    CREATE TRIGGER trg_enterprise_regions_updated BEFORE UPDATE ON enterprise_regions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enterprise_branches_updated') THEN
    CREATE TRIGGER trg_enterprise_branches_updated BEFORE UPDATE ON enterprise_branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_branch_managers_updated') THEN
    CREATE TRIGGER trg_branch_managers_updated BEFORE UPDATE ON enterprise_branch_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enterprise_roles_updated') THEN
    CREATE TRIGGER trg_enterprise_roles_updated BEFORE UPDATE ON enterprise_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_org_policies_updated') THEN
    CREATE TRIGGER trg_org_policies_updated BEFORE UPDATE ON organization_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Enable realtime for enterprise tables (no IF EXISTS syntax)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'enterprise_regions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE enterprise_regions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'enterprise_branches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE enterprise_branches;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'enterprise_branch_managers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE enterprise_branch_managers;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'enterprise_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE enterprise_events;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'organization_policies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organization_policies;
  END IF;
END $$;