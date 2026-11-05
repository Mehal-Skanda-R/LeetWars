import { supabase } from './supabase'

export type PublicProfile = {
  public_id: string
  handle: string
  display_name: string
  leetcode_profile_url: string | null
}

export function validateLeetCodeProfileUrl(value: string): { url: string | null; error: string | null } {
  const trimmed = value.trim()
  if (!trimmed) return { url: null, error: null }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { url: null, error: 'Enter a full LeetCode profile URL, such as https://leetcode.com/u/yourname/.' }
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.hostname.toLowerCase() !== 'leetcode.com'
    || parsed.port !== ''
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || !/^\/(?:u\/)?[a-zA-Z0-9_-]{1,50}\/?$/.test(parsed.pathname)
  ) {
    return { url: null, error: 'Use a LeetCode profile URL on leetcode.com without query parameters.' }
  }

  const path = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`
  return { url: `https://leetcode.com${path}`, error: null }
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

export type PublicChallenge = {
  slug: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
  input_format: string
  output_format: string
  sample_input: string
  sample_output: string
  starter_javascript: string
  starter_python: string
  xp_reward: number
}

export type PublicChallengeLeaderboardEntry = {
  public_id: string
  handle: string
  display_name: string
  challenges_solved: number
  challenge_xp: number
  challenge_rank: number
}

export type ChallengeJudgeStatus = 'queued' | 'processing' | 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'judge_error'

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
    .select('public_id, handle, display_name, leetcode_profile_url')
    .order('handle', { ascending: true })

  if (error) return { data: null, error: 'Public profiles are temporarily unavailable.' }
  return { data: (data ?? []) as PublicProfile[], error: null }
}

export async function getMyLeetCodeProfileUrl(userId: string): Promise<PublicArenaResult<string | null>> {
  if (!supabase) return { data: null, error: 'Account settings are not configured on this deployment.' }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('leetcode_profile_url')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return { data: null, error: 'Could not load your profile settings.' }
    return { data: data.leetcode_profile_url ?? null, error: null }
  } catch {
    return { data: null, error: 'Could not load your profile settings. Check your connection and try again.' }
  }
}

export async function setMyLeetCodeProfileUrl(url: string | null): Promise<PublicArenaResult<string | null>> {
  if (!supabase) return { data: null, error: 'Account settings are not configured on this deployment.' }
  try {
    const { data, error } = await supabase.rpc('set_my_leetcode_profile_url', { p_url: url })
    if (error) return { data: null, error: 'Could not save your LeetCode profile URL. Please try again.' }
    return { data: typeof data === 'string' ? data : null, error: null }
  } catch {
    return { data: null, error: 'Could not save your LeetCode profile URL. Check your connection and try again.' }
  }
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

export async function getPublicChallenges(): Promise<PublicArenaResult<PublicChallenge[]>> {
  if (!supabase) return { data: null, error: 'This deployment is missing its public data connection. Contact the project owner.' }
  const { data, error } = await supabase
    .from('public_api_challenges')
    .select('slug, title, difficulty, description, input_format, output_format, sample_input, sample_output, starter_javascript, starter_python, xp_reward')
    .order('difficulty', { ascending: true })
  if (error) return { data: null, error: 'The challenge catalog is temporarily unavailable.' }
  return { data: (data ?? []) as PublicChallenge[], error: null }
}

export async function getPublicChallengeLeaderboard(): Promise<PublicArenaResult<PublicChallengeLeaderboardEntry[]>> {
  if (!supabase) return { data: null, error: 'This deployment is missing its public data connection. Contact the project owner.' }
  const { data, error } = await supabase
    .from('public_api_challenge_leaderboard')
    .select('public_id, handle, display_name, challenges_solved, challenge_xp, challenge_rank')
    .order('challenge_rank', { ascending: true })
  if (error) return { data: null, error: 'The challenge leaderboard is temporarily unavailable.' }
  return { data: (data ?? []) as PublicChallengeLeaderboardEntry[], error: null }
}

export async function getMyChallengeSlugs(userId: string): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('challenge_completions')
    .select('challenge_slug')
    .eq('user_id', userId)
  if (error) return []
  return (data ?? []).map(row => row.challenge_slug as string)
}

export async function submitChallenge(slug: string, language: 'javascript' | 'python', sourceCode: string): Promise<PublicArenaResult<string>> {
  if (!supabase) return { data: null, error: 'Challenge submissions are not configured on this deployment.' }
  try {
    const { data, error } = await supabase.functions.invoke('submit-challenge', { body: { slug, language, source_code: sourceCode } })
    if (error || typeof data?.submission_id !== 'string') return { data: null, error: data?.error ?? 'Could not submit your code. Please try again.' }
    return { data: data.submission_id, error: null }
  } catch {
    return { data: null, error: 'Could not submit your code. Check your connection and try again.' }
  }
}

export async function checkChallengeSubmission(submissionId: string): Promise<PublicArenaResult<{ status: ChallengeJudgeStatus; xp_awarded: number }>> {
  if (!supabase) return { data: null, error: 'Challenge submissions are not configured on this deployment.' }
  try {
    const { data, error } = await supabase.functions.invoke('check-challenge', { body: { submission_id: submissionId } })
    if (error || typeof data?.status !== 'string') return { data: null, error: data?.error ?? 'Could not check the judge result.' }
    return { data: { status: data.status as ChallengeJudgeStatus, xp_awarded: Number(data.xp_awarded ?? 0) }, error: null }
  } catch {
    return { data: null, error: 'Could not check the judge result. Please try again.' }
  }
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
