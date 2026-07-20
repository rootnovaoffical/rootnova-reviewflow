/*
# Add business onboarding columns

1. Modified Tables
- `businesses`
  - `business_category` (text, nullable) — business category/type for onboarding (e.g. "Restaurant", "Salon", "Clinic")
  - `contact_email` (text, nullable) — business contact email
  - `contact_phone` (text, nullable) — business contact phone
  - `location_city` (text, nullable) — business city for onboarding
  - `onboarding_completed` (boolean, default false) — whether the business admin has completed the onboarding wizard

2. Security
- No new tables created.
- No RLS policy changes needed — existing policies already cover these columns via the same row-level checks.
- Public read policy (`businesses_public_read`) will expose these columns for active+public businesses, which is safe (they are non-sensitive metadata).
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'business_category') THEN
    ALTER TABLE businesses ADD COLUMN business_category text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'contact_email') THEN
    ALTER TABLE businesses ADD COLUMN contact_email text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'contact_phone') THEN
    ALTER TABLE businesses ADD COLUMN contact_phone text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'location_city') THEN
    ALTER TABLE businesses ADD COLUMN location_city text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE businesses ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;
