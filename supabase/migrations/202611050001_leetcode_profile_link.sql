-- Optional, user-submitted LeetCode profile URL.
-- The URL is not verified and is only public when the owning profile is public.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leetcode_profile_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_leetcode_profile_url_format_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_leetcode_profile_url_format_check
      CHECK (
        leetcode_profile_url IS NULL
        OR leetcode_profile_url ~* '^https://(www\.)?leetcode\.com/(u/)?[a-z0-9_-]{1,50}/?$'
      );
  END IF;
END;
$$;

CREATE OR REPLACE VIEW public.public_api_profiles
WITH (security_barrier = true, security_invoker = false)
AS
SELECT public_id, handle, display_name, leetcode_profile_url
FROM public.profiles
WHERE is_public = true;

COMMENT ON COLUMN public.profiles.leetcode_profile_url IS
  'Optional user-submitted LeetCode profile URL. Not verified; only exposed through public_api_profiles for opted-in profiles.';
COMMENT ON VIEW public.public_api_profiles IS
  'Anonymous allowlist; exposes opted-in public profile fields, including an optional unverified user-submitted LeetCode profile URL. Keep base-table SELECT denied to anon.';

CREATE OR REPLACE FUNCTION public.set_my_leetcode_profile_url(p_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  clean_url text := nullif(btrim(coalesce(p_url, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF clean_url IS NOT NULL
     AND clean_url !~* '^https://(www\.)?leetcode\.com/(u/)?[a-z0-9_-]{1,50}/?$' THEN
    RAISE EXCEPTION 'Enter a valid LeetCode profile URL';
  END IF;

  IF clean_url IS NOT NULL THEN
    clean_url := 'https://leetcode.com/' || regexp_replace(clean_url, '^https://(www\.)?leetcode\.com/', '', 'i');
    IF right(clean_url, 1) <> '/' THEN
      clean_url := clean_url || '/';
    END IF;
  END IF;

  UPDATE public.profiles
  SET leetcode_profile_url = clean_url
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile is unavailable';
  END IF;

  RETURN clean_url;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_leetcode_profile_url(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_leetcode_profile_url(text) TO authenticated;

COMMIT;
