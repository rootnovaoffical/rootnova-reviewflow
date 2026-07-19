/*
# Make Google Review URL optional, derive from Place ID

## Purpose
Business owners no longer need to manually enter a Google Review URL. The
primary Google identity input is now the **Google Place ID**. The direct
Google review-writing destination is derived automatically from the Place ID
using the format:
  https://search.google.com/local/writereview?placeid={GOOGLE_PLACE_ID}

## Changes
1. `businesses.google_review_url` — changed from NOT NULL to NULLABLE. Existing
   manually-configured URLs are preserved and used as a secondary fallback.
2. `businesses.google_review_url_derived` — new TEXT column storing the
   auto-generated direct review URL computed from `google_place_id`. Populated
   by a trigger whenever `google_place_id` is set or changed.
3. Trigger `businesses_derive_review_url` — before INSERT/UPDATE, computes the
   derived URL from the Place ID (URL-encoded) and stores it. If no Place ID,
   the derived column is set to NULL.
4. Seed update — the seeded "Happy Hour Cafe" now has a real Google Place ID
   so the acceptance test opens the actual Google review-writing experience.

## Security
- No RLS policy changes. Existing policies still apply.
- The derived URL is computed server-side in a SECURITY DEFINER trigger, so
  clients cannot inject arbitrary URLs — only a Place ID is accepted and it is
  URL-encoded before being placed into the fixed template.

## Fallback priority (enforced in edge function + frontend helper)
1. Auto-generated direct review URL from Google Place ID (google_review_url_derived)
2. Saved google_review_url (legacy manually-configured URL)
3. google_maps_url (final fallback)
*/

-- 1. Make google_review_url nullable (preserve existing values).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses'
      AND column_name = 'google_review_url' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.businesses ALTER COLUMN google_review_url DROP NOT NULL;
  END IF;
END $$;

-- 2. Add derived review URL column.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_review_url_derived text;

-- 3. Trigger function to derive the review URL from the Place ID.
CREATE OR REPLACE FUNCTION public.derive_google_review_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.google_place_id IS NOT NULL AND btrim(NEW.google_place_id) <> '' THEN
    NEW.google_review_url_derived :=
      'https://search.google.com/local/writereview?placeid=' ||
      encode(convert_to(btrim(NEW.google_place_id), 'UTF8'), 'hex')::text;
    -- Note: the above hex-encoding is NOT url-encoding; use proper url encoding
    -- via a regex-safe approach. Place IDs are ASCII alnum + '-' + '_' so a
    -- simple escape is enough, but we use a robust approach below instead.
  ELSE
    NEW.google_review_url_derived := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Replace with a simpler, correct implementation using standard URL-encoding
-- of the trimmed place id. Place IDs are URL-safe characters, but we still
-- percent-encode defensively for any unexpected characters.
CREATE OR REPLACE FUNCTION public.url_encode(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_agg(
    CASE
      WHEN ch ~ '[A-Za-z0-9._~-]' THEN ch
      ELSE '%' || lpad(to_hex(ascii(ch)), 2, '0')
    END,
    ''
  )
  FROM regexp_split_to_table(p_text, '') AS ch;
$$;

CREATE OR REPLACE FUNCTION public.derive_google_review_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.google_place_id IS NOT NULL AND btrim(NEW.google_place_id) <> '' THEN
    NEW.google_review_url_derived :=
      'https://search.google.com/local/writereview?placeid=' ||
      public.url_encode(btrim(NEW.google_place_id));
  ELSE
    NEW.google_review_url_derived := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_derive_review_url ON public.businesses;
CREATE TRIGGER businesses_derive_review_url
  BEFORE INSERT OR UPDATE OF google_place_id ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.derive_google_review_url();

-- 4. Backfill the derived URL for existing businesses and update the seed.
UPDATE public.businesses
  SET google_place_id = google_place_id
  WHERE google_place_id IS NOT NULL;

-- Update seeded Happy Hour Cafe with a real Place ID (Google's well-known
-- example Place ID for testing) so the acceptance test opens the real review
-- writing experience. This is Google's documented sample Place ID.
UPDATE public.businesses
  SET google_place_id = 'ChIJN1t_tDeuEmsRUsoyG83frE4',
      google_maps_url = 'https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frE4'
  WHERE slug = 'happy-hour-cafe';
