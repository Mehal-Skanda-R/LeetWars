import { supabase } from './supabase'

export type PublicProfile = {
  public_id: string
  handle: string
  display_name: string
}

export type PublicLeaderboardEntry = PublicProfile & {
  total_xp: number
  level: number
  leaderboard_rank: number
}

export type PublicTeam = {
  id: string
  name: string
  description: string
  created_at: string
}

export type PublicTeamMember = {
  team_id: string
  public_id: string
  handle: string
  display_name: string
  role: string
  joined_at: string
}

export type PublicArenaResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function getPublicLeaderboard(): Promise<PublicArenaResult<PublicLeaderboardEntry[]>> {
  if (!supabase) {
    return { data: null, error: 'Public data is not configured yet.' }
  }

  const { data, error } = await supabase
    .from('public_api_leaderboard')
    .select('public_id, handle, display_name, total_xp, level, leaderboard_rank')
    .order('leaderboard_rank', { ascending: true })

  if (error) return { data: null, error: 'The leaderboard is temporarily unavailable.' }
  return { data: (data ?? []) as PublicLeaderboardEntry[], error: null }
}

export async function getPublicProfiles(): Promise<PublicArenaResult<PublicProfile[]>> {
  if (!supabase) return { data: null, error: 'Public data is not configured yet.' }

  const { data, error } = await supabase
    .from('public_api_profiles')
    .select('public_id, handle, display_name')
    .order('handle', { ascending: true })

  if (error) return { data: null, error: 'Public profiles are temporarily unavailable.' }
  return { data: (data ?? []) as PublicProfile[], error: null }
}

export async function getPublicTeams(): Promise<PublicArenaResult<PublicTeam[]>> {
  if (!supabase) return { data: null, error: 'Public data is not configured yet.' }

  const { data, error } = await supabase
    .from('public_api_teams')
    .select('id, name, description, created_at')
    .order('name', { ascending: true })

  if (error) return { data: null, error: 'Public teams are temporarily unavailable.' }
  return { data: (data ?? []) as PublicTeam[], error: null }
}

export async function getPublicTeamMembers(teamId: string): Promise<PublicArenaResult<PublicTeamMember[]>> {
  if (!supabase) return { data: null, error: 'Public data is not configured yet.' }

  const { data, error } = await supabase
    .from('public_api_team_members')
    .select('team_id, public_id, handle, display_name, role, joined_at')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

  if (error) return { data: null, error: 'This public team roster is temporarily unavailable.' }
  return { data: (data ?? []) as PublicTeamMember[], error: null }
}
