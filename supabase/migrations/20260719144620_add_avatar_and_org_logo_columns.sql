/*
# Add avatar_url to profiles and logo_url to organizations

1. Modified Tables
- `profiles`: add `avatar_url` (text, nullable) — stores the user's profile avatar image URL.
- `organizations`: add `logo_url` (text, nullable) — stores the organization's logo image URL.

2. Security
- No RLS policy changes. Existing policies on `profiles` and `organizations` already cover SELECT/UPDATE for authorized users.
- Avatar uploads go through the `business-logos` storage bucket (reused for all avatars) with existing RLS, or a new `avatars` bucket.

3. Notes
- Both columns are nullable so existing rows are unaffected.
- The frontend will use these columns to render avatars/logos with an initials fallback.
- No data is lost; this is purely additive.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'logo_url') THEN
    ALTER TABLE public.organizations ADD COLUMN logo_url text;
  END IF;
END $$;
