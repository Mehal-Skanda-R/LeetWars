import { authenticatedUser, json, preflightOrReject, statusFromJudge } from '../_shared/challenge.ts'

Deno.serve(async request => {
  const rejection = preflightOrReject(request)
  if (rejection) return rejection

  try {
    const context = await authenticatedUser(request)
    if (!context) return json({ error: 'Sign in to check this submission.' }, 401)
    const payload = await request.json()
    const submissionId = typeof payload?.submission_id === 'string' ? payload.submission_id : ''
    if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: 'Submission is invalid.' }, 400)

    const { data: submission, error: submissionError } = await context.admin
      .from('challenge_submissions')
      .select('id, user_id, challenge_slug, judge_token, status')
      .eq('id', submissionId)
      .eq('user_id', context.user.id)
      .maybeSingle()
    if (submissionError || !submission) return json({ error: 'Submission is unavailable.' }, 404)
    if (submission.status !== 'queued' && submission.status !== 'processing') {
      return json({ status: submission.status, xp_awarded: 0 })
    }
    if (typeof submission.judge_token !== 'string' || !submission.judge_token) {
      return json({ error: 'The judge is still preparing this submission.' }, 409)
    }

    const judgeUrl = Deno.env.get('JUDGE0_URL')?.replace(/\/$/, '')
    const authToken = Deno.env.get('JUDGE0_AUTH_TOKEN')
    if (!judgeUrl || !authToken) return json({ error: 'The LeetWars judge is not configured yet.' }, 503)
    const parsedJudgeUrl = new URL(judgeUrl)
    if (parsedJudgeUrl.protocol !== 'https:' && parsedJudgeUrl.hostname !== 'localhost') {
      return json({ error: 'The code judge must use HTTPS.' }, 503)
    }
    const headers: Record<string, string> = {}
    headers['X-Auth-Token'] = authToken
    const judgeResponse = await fetch(
      `${judgeUrl}/submissions/${encodeURIComponent(submission.judge_token)}?base64_encoded=false&fields=status`,
      { headers, signal: AbortSignal.timeout(6_000) },
    )
    if (!judgeResponse.ok) return json({ error: 'Could not check the judge result.' }, 503)
    const judgeResult = await judgeResponse.json()
    const mapped = statusFromJudge(typeof judgeResult?.status?.description === 'string' ? judgeResult.status.description : '')
    let awarded = 0
    if (mapped.done) {
      if (mapped.status === 'accepted') {
        const { data, error } = await context.admin.rpc('award_challenge_completion', {
          p_user_id: context.user.id,
          p_challenge_slug: submission.challenge_slug,
        })
        if (error) return json({ error: 'Your solution passed, but the stats update needs a retry.' }, 503)
        awarded = Number(data ?? 0)
      }
      const { error: updateError } = await context.admin
        .from('challenge_submissions')
        .update({ status: mapped.status, judged_at: new Date().toISOString() })
        .eq('id', submission.id)
        .eq('user_id', context.user.id)
      if (updateError) return json({ error: 'Could not save the judge result.' }, 503)
    } else {
      await context.admin.from('challenge_submissions').update({ status: mapped.status }).eq('id', submission.id).eq('user_id', context.user.id)
    }

    return json({ status: mapped.status, xp_awarded: awarded })
  } catch {
    return json({ error: 'Could not check your submission. Please try again.' }, 500)
  }
})
