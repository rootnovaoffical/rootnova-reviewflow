# RootNova ReviewFlow™ — Live System Specification

Source of truth: the provisioned Supabase backend (schema, RLS, functions, storage, edge functions).
Captured: 2026-07-19.

## 1. Database Schema

### profiles
- `id` uuid PK → `auth.users.id` ON DELETE CASCADE
- `full_name` text default ''
- `email` text
- `role` text NOT NULL default 'BUSINESS_ADMIN' — CHECK in (`ROOTNOVA_SUPER_ADMIN`, `ROOTNOVA_ADMIN`, `PARTNER_OWNER`, `PARTNER_ADMIN`, `PARTNER_TEAM_MEMBER`, `BUSINESS_ADMIN`)
- `created_at`, `updated_at` timestamptz default now()
- `account_status` text default 'ACTIVE'
- Trigger: `profiles_updated_at` BEFORE UPDATE → `set_updated_at()`
- Trigger: `handle_new_user` on `auth.users` INSERT → creates profile with role BUSINESS_ADMIN

### organizations
- `id` uuid PK
- `name` text NOT NULL
- `slug` text NOT NULL UNIQUE
- `type` text NOT NULL default 'PARTNER' — CHECK in (`ROOTNOVA`, `PARTNER`)
- `contact_email`, `contact_phone` text
- `status` text NOT NULL default 'ACTIVE' — CHECK in (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`)
- `metadata` jsonb default '{}'
- `created_at`, `updated_at`

### organization_members
- `id` uuid PK
- `organization_id` uuid NOT NULL → organizations ON DELETE CASCADE
- `user_id` uuid NOT NULL → auth.users ON DELETE CASCADE
- `role` text NOT NULL default 'TEAM_MEMBER' — CHECK in (`OWNER`, `ADMIN`, `TEAM_MEMBER`)
- `status` text NOT NULL default 'ACTIVE' — CHECK in (`ACTIVE`, `SUSPENDED`, `DISABLED`)
- UNIQUE (organization_id, user_id)

### businesses
- `id` uuid PK
- `name` text NOT NULL
- `slug` text NOT NULL UNIQUE
- `logo_url` text
- `primary_color` text default '#6366f1'
- `secondary_color` text default '#a855f7'
- `welcome_message` text default 'We'd love to hear about your experience!'
- `google_place_id`, `google_maps_url`, `google_review_url` text
- `public_review_enabled` boolean NOT NULL default true
- `status` text NOT NULL default 'active' — CHECK in (`active`, `inactive`)
- `organization_id` uuid → organizations ON DELETE SET NULL
- `google_review_url_derived` text (auto-derived from place_id by trigger)
- Triggers: `businesses_derive_review_url` BEFORE INSERT/UPDATE → `derive_google_review_url()`

### questions
- `id` uuid PK
- `business_id` uuid NOT NULL → businesses ON DELETE CASCADE
- `question_text` text NOT NULL
- `question_type` text NOT NULL default 'multiple_choice' — CHECK = 'multiple_choice'
- `flow_type` text NOT NULL — CHECK in (`ALWAYS`, `POSITIVE`, `NEGATIVE`)
- `options` jsonb NOT NULL default '[]'
- `is_required` boolean NOT NULL default true
- `is_active` boolean NOT NULL default true
- `sort_order` integer NOT NULL default 0

### review_sessions
- `id` uuid PK
- `business_id` uuid NOT NULL → businesses ON DELETE CASCADE
- `rating` integer NOT NULL — CHECK 1..5
- `answers` jsonb NOT NULL default '[]'
- `ai_generated_review` text
- `ai_status` text NOT NULL default 'pending' — CHECK in (`pending`, `generating`, `completed`, `failed`)
- `google_place_id_snapshot` text
- `created_at`, `completed_at` timestamptz

### analytics_events
- `id` uuid PK
- `business_id` uuid → businesses ON DELETE CASCADE
- `session_id` uuid → review_sessions ON DELETE CASCADE
- `event_type` text NOT NULL
- `metadata` jsonb default '{}'

### plans
- `id` uuid PK
- `name`, `slug` (UNIQUE), `description`
- `monthly_price`, `annual_price`, `setup_fee` numeric NOT NULL default 0
- `max_businesses`, `max_review_sessions`, `max_team_members`, `ai_usage_allowance`, `trial_duration_days` integer
- `features` jsonb NOT NULL default '{}'
- `is_active` boolean NOT NULL default true
- `sort_order` integer

### subscriptions
- `id` uuid PK
- `organization_id` uuid NOT NULL → organizations ON DELETE CASCADE
- `plan_id` uuid NOT NULL → plans
- `status` text NOT NULL default 'TRIAL' — CHECK in (`TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`)
- `billing_cycle` text NOT NULL default 'MONTHLY' — CHECK in (`MONTHLY`, `ANNUAL`)
- `custom_monthly_price`, `custom_setup_fee`, `discount_percent` numeric
- `discount_duration_months`, `pricing_lock_months` integer
- `pricing_lock_until`, `contract_start_date`, `contract_end_date` date
- `trial_ends_at`, `current_period_start`, `current_period_end`, `grace_period_ends_at` timestamptz
- `is_founding_partner` boolean NOT NULL default false

### payments
- `id` uuid PK
- `organization_id` uuid NOT NULL → organizations ON DELETE CASCADE
- `subscription_id` uuid → subscriptions ON DELETE SET NULL
- `amount` numeric NOT NULL
- `payment_purpose` text NOT NULL default 'SUBSCRIPTION'
- `payment_method` text NOT NULL default 'UPI'
- `upi_id`, `screenshot_path`, `utr_reference` text
- `payment_date` date
- `status` text NOT NULL default 'PENDING' — CHECK in (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `EXPIRED`)
- `rejection_reason` text
- `reviewed_by` uuid → auth.users, `reviewed_at` timestamptz
- `approved_by` uuid → auth.users, `approved_at` timestamptz
- `submitted_by` uuid NOT NULL → auth.users
- `metadata` jsonb default '{}'

### platform_assets
- `id` uuid PK
- `key` text NOT NULL UNIQUE
- `label` text NOT NULL
- `asset_type` text NOT NULL default 'IMAGE' — values observed: IMAGE, COLOR, CONFIG
- `storage_path` text
- `public_url` text
- `metadata` jsonb default '{}'
- `is_active` boolean NOT NULL default true

### feature_flags
- `id` uuid PK
- `key` text NOT NULL UNIQUE
- `label`, `description` text
- `is_enabled` boolean NOT NULL default true
- `category` text NOT NULL default 'GENERAL'

### audit_logs
- `id` uuid PK
- `actor_id` uuid → auth.users
- `actor_email` text
- `action` text NOT NULL
- `target_type` text, `target_id` uuid
- `organization_id` uuid → organizations ON DELETE SET NULL
- `metadata` jsonb default '{}'

### business_admins
- `id` uuid PK
- `business_id` uuid NOT NULL → businesses ON DELETE CASCADE
- `user_id` uuid NOT NULL → auth.users ON DELETE CASCADE
- UNIQUE (business_id, user_id)

### admin_invitations
- `id` uuid PK
- `email` text NOT NULL
- `role` text NOT NULL — CHECK in (`ROOTNOVA_ADMIN`, `BUSINESS_ADMIN`)
- `business_id` uuid → businesses ON DELETE SET NULL
- `status` text NOT NULL default 'INVITED' — CHECK in (`INVITED`, `PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `DEACTIVATED`)
- `invited_by` uuid NOT NULL → auth.users

## 2. Database Functions

| Function | Args | Returns | Security | Purpose |
|---|---|---|---|---|
| `is_rootnova_super_admin()` | — | boolean | DEFINER | profile.role = ROOTNOVA_SUPER_ADMIN |
| `is_rootnova_admin()` | — | boolean | INVOKER | profile.role = ROOTNOVA_ADMIN (NOT super admin) |
| `is_rootnova_staff()` | — | boolean | DEFINER | role in (ROOTNOVA_SUPER_ADMIN, ROOTNOVA_ADMIN) |
| `is_partner_owner(p_org_id)` | org uuid | boolean | DEFINER | active OWNER member of org |
| `is_partner_admin(p_org_id)` | org uuid | boolean | DEFINER | active OWNER or ADMIN member |
| `is_partner_member(p_org_id)` | org uuid | boolean | DEFINER | any active member |
| `is_business_admin(p_business_id)` | biz uuid | boolean | INVOKER | row in business_admins |
| `is_business_owner(p_business_id)` | biz uuid | boolean | DEFINER | org OWNER/ADMIN of business's org |
| `is_business_org_member(p_business_id)` | biz uuid | boolean | DEFINER | any active org member of business's org |
| `user_organization_id()` | — | uuid | DEFINER | first active org membership for user |
| `log_audit(action, target_type, target_id, org_id, metadata)` | — | void | DEFINER | inserts audit_logs row with actor info |
| `claim_initial_admin(p_full_name)` | name | void | INVOKER | promotes first user to ROOTNOVA_ADMIN (guard: no existing admin) |
| `seed_rootnova_organization()` | — | uuid | DEFINER | idempotent insert of RootNova org |
| `derive_google_review_url()` | — | trigger | DEFINER | sets google_review_url_derived from place_id |
| `handle_new_user()` | — | trigger | DEFINER | creates profile on auth.users INSERT |
| `set_updated_at()` | — | trigger | INVOKER | updates updated_at column |
| `url_encode(p_text)` | text | text | INVOKER | URL-encodes text |

**Known quirk:** `is_rootnova_admin()` checks ONLY `ROOTNOVA_ADMIN`, not `ROOTNOVA_SUPER_ADMIN`. Policies using `is_rootnova_admin()` (admin_invitations, business_admins, profiles admin update) exclude the super admin. Super admin access goes through `is_rootnova_staff()` or `is_rootnova_super_admin()`.

## 3. RLS Policy Summary

### Public (anon + authenticated) read
- `businesses` SELECT: status='active' AND public_review_enabled=true
- `questions` SELECT: is_active=true AND business is active+enabled
- `review_sessions` INSERT: rating 1-5 AND business active+enabled
- `analytics_events` INSERT: business is active (or business_id null)
- `platform_assets` SELECT: is_active=true
- `feature_flags` SELECT: true (all authenticated)
- `plans` SELECT: is_active=true OR rootnova staff

### Authenticated — RootNova staff (super admin + admin)
- Full CRUD on organizations, businesses, questions, review_sessions, analytics_events, payments (update), subscriptions, plans, feature_flags, platform_assets, audit_logs (select)
- business_admins: select (is_rootnova_admin OR own user_id), insert/update/delete (is_rootnova_admin only — excludes super admin)

### Authenticated — Partner (org-scoped)
- organizations: select own, update own (OWNER only)
- organization_members: select own org, insert (ADMIN+), update/delete (OWNER+)
- businesses: select/insert/update/delete own org's businesses
- questions: CRUD own org's businesses' questions
- review_sessions, analytics_events: select own org's
- payments: select own org's, insert (member + submitted_by=self), update (rootnova staff only)
- subscriptions: select own org's

## 4. Storage Buckets

| Bucket | Public | Purpose | Upload | Read | Delete/Update |
|---|---|---|---|---|---|
| `business-logos` | yes | Business logos | rootnova admin OR business_admin(folder=biz_id) | anon (public) | rootnova admin OR business_admin |
| `payment-proofs` | no | Payment screenshots | partner_member (folder=org_id) | rootnova_staff OR partner (folder=own org) | rootnova_staff only |
| `platform-assets` | yes | RootNova logos, favicon, UPI QR | rootnova_super_admin only | anon (public) | rootnova_super_admin only |

Folder convention: `business-logos/{business_id}/file`, `payment-proofs/{organization_id}/file`, `platform-assets/{key}/file`.

## 5. Edge Functions

| Slug | JWT | Purpose |
|---|---|---|
| `generate-review` | off | POST {sessionId, businessName, rating, answers} → calls OpenAI (gpt-4o-mini → gpt-3.5-turbo fallback), updates review_sessions.ai_generated_review + ai_status. Falls back to local template if no OpenAI key or all models fail. |
| `manage-admin` | on | GET /setup-status → {hasBusinesses, role, fullName, email}. POST /invite {email, role, business_id} → inserts admin_invitations (ROOTNOVA_SUPER_ADMIN or ROOTNOVA_ADMIN only). |
| `setup-status` | off | GET → {hasBusinesses, hasAdmin, needsSetup} for first-run detection. |

## 6. Authentication Model

- Supabase email/password auth. Email confirmation OFF.
- `handle_new_user` trigger creates a `profiles` row with role `BUSINESS_ADMIN` on signup.
- `claim_initial_admin(p_full_name)` RPC promotes the first user to `ROOTNOVA_ADMIN` (guard: fails if any ROOTNOVA_ADMIN exists).
- Roles live in `profiles.role`, not JWT claims.

## 7. Role Model

| Role | Scope | Can access |
|---|---|---|
| ROOTNOVA_SUPER_ADMIN | Platform-wide | All organizations, businesses, payments, plans, feature flags, platform_assets, audit logs. Storage: platform-assets upload. |
| ROOTNOVA_ADMIN | Platform-wide (minus super-admin-only ops) | Most platform data via is_rootnova_staff(). Cannot manage platform_assets (super admin only). Cannot manage business_admins (is_rootnova_admin excludes super admin — see quirk). |
| PARTNER_OWNER | Own organization | Org settings, members, businesses, payments (submit), subscriptions (read). |
| PARTNER_ADMIN | Own organization | Same as OWNER minus org-level settings. |
| PARTNER_TEAM_MEMBER | Own organization | Read access to org data. |
| BUSINESS_ADMIN | Assigned business | Manage assigned business, questions, view reviews/analytics. |

## 8. Existing Data

- 1 profile: shivam@rootnova.com (ROOTNOVA_SUPER_ADMIN)
- 1 organization: RootNova (type=ROOTNOVA)
- 1 organization_member: super admin as OWNER of RootNova org
- 1 business: Happy Hour Cafe (slug=happy-hour-cafe, org=RootNova, active, public_review_enabled, google_place_id set)
- 3 questions: ALWAYS "How did you hear about us?", POSITIVE "What did you enjoy most?", NEGATIVE "What could we improve?"
- 11 review_sessions, 90 analytics_events
- 3 plans: Starter (₹999/mo), Professional (₹2999/mo), Enterprise (₹9999/mo)
- 8 platform_assets: rootnova_logo, rootnova_favicon, rootnova_login_logo, rootnova_email_logo, rootnova_upi_config (upi_id=rootnova@upi), rootnova_upi_qr (inactive), rootnova_default_primary_color (#6366f1), rootnova_default_secondary_color (#a855f7)
- 9 feature_flags across AI, ANALYTICS, BRANDING, DEVELOPER, GENERAL, SUPPORT categories
- 0 payments, 0 subscriptions, 0 audit_logs, 0 business_admins, 0 admin_invitations

## 9. Public Review Flow

Route: `/r/:businessSlug`
1. Lookup business by slug (anon SELECT, must be active + public_review_enabled)
2. Load active questions (anon SELECT, filtered by flow_type: ALWAYS always, POSITIVE if rating≥4, NEGATIVE if rating≤3)
3. Customer selects rating 1-5
4. Conditional questions shown based on rating
5. Submit → insert review_session (anon INSERT) + analytics events
6. Call `generate-review` edge function (no JWT) → AI generates review text
7. Poll for ai_status: pending → generating → completed/failed
8. Display AI-generated review with copy button
9. Google review CTA → opens google_review_url_derived (from place_id) or google_review_url
10. Analytics events tracked throughout

## 10. Route Map (to implement)

### Public
- `/r/:businessSlug` — customer review flow
- `/login` — sign in
- `/signup` — sign up (first user can claim admin)

### Super Admin (`/superadmin/*`)
- `/superadmin` — dashboard
- `/superadmin/organizations` — organization list
- `/superadmin/organizations/:id` — organization workspace
- `/superadmin/businesses` — business list
- `/superadmin/businesses/:id` — business workspace
- `/superadmin/branding` — platform branding (text, colors, logos)
- `/superadmin/payments` — payment review queue
- `/superadmin/payments/:id` — payment detail
- `/superadmin/plans` — plan management
- `/superadmin/feature-flags` — feature flag management
- `/superadmin/audit` — audit log viewer
- `/superadmin/team` — platform admin team
- `/superadmin/settings` — platform settings

### Partner (`/partner/*`)
- `/partner` — dashboard
- `/partner/businesses` — business list
- `/partner/businesses/:id` — business workspace
- `/partner/businesses/new` — create business
- `/partner/payments` — payment submission + history
- `/partner/team` — team management
- `/partner/billing` — subscription + billing
- `/partner/settings` — organization settings

## 11. Environment Variables

Pre-populated in `.env` (do not expose in frontend):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `OPENAI_API_KEY` (edge function secret, not in frontend)

## 12. Known Constraints

1. `is_rootnova_admin()` excludes ROOTNOVA_SUPER_ADMIN — business_admins and admin_invitations management requires ROOTNOVA_ADMIN role. May need additive policy to include super admin.
2. No subscription exists yet — partner billing starts from scratch.
3. Platform assets have no uploaded files yet (storage_path/public_url null) — logos are conceptual until uploaded.
4. UPI QR asset is inactive — no QR image uploaded.
5. No audit_logs yet — log_audit function exists but nothing calls it automatically; frontend must call it explicitly after actions.
6. `question_type` is locked to 'multiple_choice' by CHECK constraint.
7. Payment status transitions are not enforced by DB triggers — frontend/edge function must manage valid transitions (PENDING→UNDER_REVIEW→APPROVED/REJECTED).
