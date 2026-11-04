-- LeetWars Milestone 1: private-by-default public discovery
-- REVIEW THIS MIGRATION BEFORE APPLYING IT TO PRODUCTION.
-- Existing profiles remain private unless their owner explicitly opts in.

BEGIN;

-- The anon role intentionally has no SELECT permission on the underlying tables.
-- Keep these owner-executed views as the only anonymous data surface: their
-- selected columns and WHERE clauses are the privacy boundary. Setting
-- security_invoker=true would require granting anon access to the base tables,
-- which could expose private columns through the REST API. Supabase's Security
-- Advisor will flag these views; review each definition and grant before release.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.public_api_profiles
WITH (security_barrier = true, security_invoker = false)
AS
SELECT public_id, handle, display_name
FROM public.profiles
WHERE is_public = true;

CREATE OR REPLACE VIEW public.public_api_leaderboard
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  p.public_id,
  p.handle,
  p.display_name,
  ps.total_xp,
  ps.level,
  RANK() OVER (ORDER BY ps.total_xp DESC) AS leaderboard_rank
FROM public.player_stats AS ps
JOIN public.profiles AS p ON p.id = ps.user_id
WHERE p.is_public = true;

CREATE OR REPLACE VIEW public.public_api_teams
WITH (security_barrier = true, security_invoker = false)
AS
SELECT id, name, description, created_at
FROM public.teams
WHERE visibility = 'public';

CREATE OR REPLACE VIEW public.public_api_team_members
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  tm.team_id,
  p.public_id,
  p.handle,
  p.display_name,
  tm.role,
  tm.joined_at
FROM public.team_members AS tm
JOIN public.teams AS t ON t.id = tm.team_id
JOIN public.profiles AS p ON p.id = tm.user_id
WHERE t.visibility = 'public'
  AND p.is_public = true;

-- Existing view grants included INSERT/UPDATE/DELETE and other privileges.
-- Clear inherited grants explicitly, then expose read access only.
REVOKE ALL PRIVILEGES ON TABLE public.public_api_profiles,
                          public.public_api_leaderboard,
                          public.public_api_teams,
                          public.public_api_team_members
FROM anon, authenticated, PUBLIC;

GRANT SELECT ON public.public_api_profiles,
                public.public_api_leaderboard,
                public.public_api_teams,
                public.public_api_team_members
TO anon, authenticated;

COMMENT ON VIEW public.public_api_profiles IS
  'Anonymous allowlist; exposes opted-in public profile fields only. Keep base-table SELECT denied to anon.';
COMMENT ON VIEW public.public_api_leaderboard IS
  'Anonymous allowlist; exposes opted-in players with public LeetWars XP and level only. Keep base-table SELECT denied to anon.';
COMMENT ON VIEW public.public_api_teams IS
  'Anonymous allowlist; exposes public team fields only. Keep base-table SELECT denied to anon.';
COMMENT ON VIEW public.public_api_team_members IS
  'Anonymous allowlist; exposes public-team roster fields for opted-in profiles only. Keep base-table SELECT denied to anon.';

COMMIT;
