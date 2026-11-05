import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export type ChallengeStatus = 'queued' | 'processing' | 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'judge_error'

const origin = Deno.env.get('LEETWARS_ORIGIN') ?? 'https://leetwars-nine.vercel.app'
const corsHeaders = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

export function preflightOrReject(request: Request): Response | null {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const requestOrigin = request.headers.get('Origin')
  if (requestOrigin && requestOrigin !== origin) return json({ error: 'Origin is not allowed.' }, 403)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  return null
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export function judgeHeaders(): Record<string, string> | null {
  const rapidApiKey = Deno.env.get('JUDGE0_RAPIDAPI_KEY')
  if (rapidApiKey) {
    return {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': Deno.env.get('JUDGE0_RAPIDAPI_HOST') ?? 'judge0-ce.p.rapidapi.com',
    }
  }
  const authToken = Deno.env.get('JUDGE0_AUTH_TOKEN')
  return authToken ? { 'X-Auth-Token': authToken } : null
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase edge function secrets are not configured.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function authenticatedUser(request: Request): Promise<{ user: User; admin: SupabaseClient } | null> {
  const authorization = request.headers.get('Authorization')
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!authorization?.startsWith('Bearer ') || !url || !anonKey) return null
  const token = authorization.slice('Bearer '.length)
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return { user: data.user, admin: adminClient() }
}

export function statusFromJudge(description: string): { status: ChallengeStatus; done: boolean } {
  const label = description.toLowerCase()
  if (label === 'in queue') return { status: 'queued', done: false }
  if (label === 'processing') return { status: 'processing', done: false }
  if (label === 'accepted') return { status: 'accepted', done: true }
  if (label.includes('wrong answer')) return { status: 'wrong_answer', done: true }
  if (label.includes('compilation error')) return { status: 'compile_error', done: true }
  if (label.includes('time limit')) return { status: 'time_limit', done: true }
  if (label.includes('runtime error') || label.includes('non-zero exit')) return { status: 'runtime_error', done: true }
  return { status: 'judge_error', done: true }
}
