import { authenticatedUser, judgeHeaders, json, preflightOrReject } from '../_shared/challenge.ts'

Deno.serve(async request => {
  const rejection = preflightOrReject(request)
  if (rejection) return rejection

  try {
    const contentLength = Number(request.headers.get('Content-Length') ?? 0)
    if (contentLength > 24_000) return json({ error: 'Submission request is too large.' }, 413)
    const context = await authenticatedUser(request)
    if (!context) return json({ error: 'Sign in before submitting a challenge.' }, 401)
    const payload = await request.json()
    const slug = typeof payload?.slug === 'string' ? payload.slug : ''
    const language = payload?.language === 'javascript' || payload?.language === 'python' ? payload.language : null
    const sourceCode = typeof payload?.source_code === 'string' ? payload.source_code : ''
    if (!/^[a-z0-9-]{2,60}$/.test(slug) || !language) return json({ error: 'Challenge or language is invalid.' }, 400)
    if (!sourceCode.trim() || new TextEncoder().encode(sourceCode).length > 16_000) return json({ error: 'Code must be between 1 and 16,000 bytes.' }, 400)

    const { data: challenge, error: challengeError } = await context.admin
      .from('challenges')
      .select('slug, hidden_input, expected_output, is_published')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
    if (challengeError || !challenge) return json({ error: 'Challenge is unavailable.' }, 404)

    const judgeUrl = Deno.env.get('JUDGE0_URL')?.replace(/\/$/, '')
    const judgeAuthHeaders = judgeHeaders()
    const languageId = Deno.env.get(language === 'javascript' ? 'JUDGE0_JAVASCRIPT_LANGUAGE_ID' : 'JUDGE0_PYTHON_LANGUAGE_ID')
    if (!judgeUrl || !judgeAuthHeaders || !languageId) return json({ error: 'The LeetWars judge is not configured yet.' }, 503)
    const parsedLanguageId = Number(languageId)
    if (!Number.isInteger(parsedLanguageId) || parsedLanguageId < 1) return json({ error: 'The LeetWars judge language is not configured.' }, 503)
    const parsedJudgeUrl = new URL(judgeUrl)
    if (parsedJudgeUrl.protocol !== 'https:' && parsedJudgeUrl.hostname !== 'localhost') {
      return json({ error: 'The code judge must use HTTPS.' }, 503)
    }

    const { data: submissionId, error: reservationError } = await context.admin.rpc('reserve_challenge_submission', {
      p_user_id: context.user.id,
      p_challenge_slug: slug,
      p_language: language,
    })
    if (reservationError || typeof submissionId !== 'string') {
      const isRateLimited = reservationError?.message.includes('Submission limit reached')
      return json({ error: isRateLimited ? 'Submission limit reached. Wait a minute and try again.' : 'Submissions are temporarily unavailable.' }, isRateLimited ? 429 : 503)
    }

    const headers: Record<string, string> = { ...judgeAuthHeaders, 'Content-Type': 'application/json' }
    const judgeResponse = await fetch(`${judgeUrl}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        language_id: parsedLanguageId,
        source_code: sourceCode,
        stdin: challenge.hidden_input,
        expected_output: challenge.expected_output,
        cpu_time_limit: 2,
        wall_time_limit: 5,
        memory_limit: 128_000,
        max_processes_and_or_threads: 20,
        max_file_size: 1_024,
        enable_network: false,
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!judgeResponse.ok) {
      await context.admin.from('challenge_submissions').update({ status: 'judge_error', judged_at: new Date().toISOString() }).eq('id', submissionId)
      return json({ error: 'The code judge could not accept this submission.' }, 503)
    }
    const judgeSubmission = await judgeResponse.json()
    if (typeof judgeSubmission?.token !== 'string' || judgeSubmission.token.length > 160) {
      await context.admin.from('challenge_submissions').update({ status: 'judge_error', judged_at: new Date().toISOString() }).eq('id', submissionId)
      return json({ error: 'The code judge returned an invalid submission.' }, 503)
    }

    const { error: saveError } = await context.admin
      .from('challenge_submissions')
      .update({ judge_token: judgeSubmission.token, status: 'queued' })
      .eq('id', submissionId)
      .eq('user_id', context.user.id)
    if (saveError) return json({ error: 'Could not track this submission. Please try again.' }, 503)
    return json({ submission_id: submissionId, status: 'queued' }, 202)
  } catch {
    return json({ error: 'Could not submit your code. Check your connection and try again.' }, 500)
  }
})
