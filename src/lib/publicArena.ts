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
    return { data: null, error: 'This deployment is missing its public data connection. Contact the project owner.' }
  }

  const { data, error } = await supabase
    .from('public_api_leaderboard')
    .select('public_id, handle, display_name, total_xp, level, leaderboard_rank')
    .order('leaderboard_rank', { ascending: true })

  if (error) return { data: null, error: 'The leaderboard is temporarily unavailable.' }
  return { data: (data ?? []) as PublicLeaderboardEntry[], error: null }
}

export async function getPublicProfiles(): Promise<PublicArenaResult<PublicProfile[]>> {
  if (!supabase) return { data: null, error: 'This deployment is missing its public data connection. Contact the project owner.' }

  const { data, error } = await supabase
    .from('public_api_profiles')
    .select('public_id, handle, display_name')
    .order('handle', { ascending: true })

  if (error) return { data: null, error: 'Public profiles are temporarily unavailable.' }
  return { data: (data ?? []) as PublicProfile[], error: null }
}

export async function getPublicTeams(): Promise<PublicArenaResult<PublicTeam[]>> {
  if (!supabase) return { data: null, error: 'This deployment is missing its public data connection. Contact the project owner.' }

  const { data, error } = await supabase
    .from('public_api_teams')
    .select('id, name, description, created_at')
    .order('name', { ascending: true })

  if (error) return { data: null, error: 'Public teams are temporarily unavailable.' }
  return { data: (data ?? []) as PublicTeam[], error: null }
}

export async function getPublicTeamMembers(teamId: string): Promise<PublicArenaResult<PublicTeamMember[]>> {
  if (!supabase) return { data: null, error: 'This deployment is missing its public data connection. Contact the project owner.' }

  const { data, error } = await supabase
    .from('public_api_team_members')
    .select('team_id, public_id, handle, display_name, role, joined_at')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

  if (error) return { data: null, error: 'This public team roster is temporarily unavailable.' }
  return { data: (data ?? []) as PublicTeamMember[], error: null }
}

export async function getMyPublicVisibility(userId: string): Promise<boolean | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_public')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data.is_public === true
  } catch {
    return null
  }
}

export async function getMyTeamIds(userId: string): Promise<string[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
    if (error) return []
    return (data ?? []).map(item => item.team_id as string)
  } catch {
    return []
  }
}

export async function setMyPublicVisibility(isPublic: boolean): Promise<PublicArenaResult<boolean>> {
  if (!supabase) return { data: null, error: 'Account actions are not configured on this deployment.' }
  try {
    const { data, error } = await supabase.rpc('set_public_profile_visibility', { p_is_public: isPublic })
    if (error) return { data: null, error: 'Could not update your leaderboard visibility. Please try again.' }
    return { data: data === true, error: null }
  } catch {
    return { data: null, error: 'Could not update your leaderboard visibility. Check your connection and try again.' }
  }
}

export async function createPublicArenaTeam(name: string, description: string): Promise<PublicArenaResult<string>> {
  if (!supabase) return { data: null, error: 'Account actions are not configured on this deployment.' }
  try {
    const { data, error } = await supabase.rpc('create_public_arena_team', {
      p_name: name.trim(),
      p_description: description.trim(),
    })
    if (error) return { data: null, error: 'Could not create the team. Check the form and try again.' }
    return { data: String(data), error: null }
  } catch {
    return { data: null, error: 'Could not create the team. Check your connection and try again.' }
  }
}

export async function joinPublicArenaTeam(teamId: string): Promise<PublicArenaResult<true>> {
  if (!supabase) return { data: null, error: 'Account actions are not configured on this deployment.' }
  try {
    const { error } = await supabase.rpc('join_public_arena_team', { p_team_id: teamId })
    if (error) return { data: null, error: 'Could not join this team. It may be full or no longer public.' }
    return { data: true, error: null }
  } catch {
    return { data: null, error: 'Could not join this team. Check your connection and try again.' }
  }
}
