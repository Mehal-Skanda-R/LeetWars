-- LeetWars Milestone 1: private-by-default public discovery
-- REVIEW THIS MIGRATION BEFORE APPLYING IT TO PRODUCTION.
-- Existing profiles remain private unless their owner explicitly opts in.

BEGIN;

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

-- Reassert only the intended public read access on the allowlisted views.
GRANT SELECT ON public.public_api_profiles,
                public.public_api_leaderboard,
                public.public_api_teams,
                public.public_api_team_members
TO anon, authenticated;

COMMIT;
