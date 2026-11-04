-- Account provisioning and opt-in participation for the Public Arena.
-- Public profiles remain private unless the user explicitly opts in.

BEGIN;

-- Preserve and harden the existing on_auth_user_created trigger rather than
-- replacing the trigger or leaving an older signup function behind.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, handle, display_name, is_public)
  VALUES (
    NEW.id,
    'player_' || replace(NEW.id::text, '-', ''),
    coalesce(
      nullif(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      'Player'
    ),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Provision accounts that predate this trigger without copying email. The
-- optional OAuth display name remains private until the player opts in.
INSERT INTO public.profiles (id, handle, display_name, is_public)
SELECT
  u.id,
  'player_' || replace(u.id::text, '-', ''),
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    'Player'
  ),
  false
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.player_stats (user_id)
SELECT p.id
FROM public.profiles AS p
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_public_profile_visibility(p_is_public boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  UPDATE public.profiles
  SET is_public = p_is_public
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile is unavailable';
  END IF;

  RETURN p_is_public;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_public_arena_team(
  p_name text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  clean_name text := btrim(coalesce(p_name, ''));
  clean_description text := btrim(coalesce(p_description, ''));
  new_team_id uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF char_length(clean_name) < 2 OR char_length(clean_name) > 40 THEN
    RAISE EXCEPTION 'Team name must be between 2 and 40 characters';
  END IF;
  IF char_length(clean_description) > 240 THEN
    RAISE EXCEPTION 'Team description must be at most 240 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id) THEN
    RAISE EXCEPTION 'Profile is unavailable';
  END IF;

  INSERT INTO public.teams (name, description, visibility, created_by)
  VALUES (clean_name, clean_description, 'public', caller_id)
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, caller_id, 'leader');

  RETURN new_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_public_arena_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  locked_team_id uuid;
  team_member_count integer;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  SELECT id INTO locked_team_id
  FROM public.teams
  WHERE id = p_team_id AND visibility = 'public'
  FOR UPDATE;
  IF locked_team_id IS NULL THEN
    RAISE EXCEPTION 'Public team is unavailable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id) THEN
    RAISE EXCEPTION 'Profile is unavailable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = caller_id
  ) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO team_member_count
  FROM public.team_members
  WHERE team_id = p_team_id;
  IF team_member_count >= 10 THEN
    RAISE EXCEPTION 'This team is full';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (p_team_id, caller_id, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.set_public_profile_visibility(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_public_arena_team(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_public_arena_team(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.set_public_profile_visibility(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_arena_team(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_public_arena_team(uuid) TO authenticated;

COMMIT;
