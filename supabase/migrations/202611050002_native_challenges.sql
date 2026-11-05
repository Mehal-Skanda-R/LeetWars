-- First LeetWars-hosted coding challenge and authoritative completion stats.
-- Hidden test data and Judge0 tokens are never exposed through public views.

BEGIN;

CREATE TABLE IF NOT EXISTS public.challenges (
  slug text PRIMARY KEY,
  title text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  description text NOT NULL,
  input_format text NOT NULL,
  output_format text NOT NULL,
  sample_input text NOT NULL,
  sample_output text NOT NULL,
  starter_javascript text NOT NULL,
  starter_python text NOT NULL,
  hidden_input text NOT NULL,
  expected_output text NOT NULL,
  xp_reward integer NOT NULL CHECK (xp_reward > 0),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_slug text NOT NULL REFERENCES public.challenges(slug) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('javascript', 'python')),
  judge_token text,
  status text NOT NULL DEFAULT 'submitting' CHECK (status IN ('submitting', 'queued', 'processing', 'accepted', 'wrong_answer', 'compile_error', 'runtime_error', 'time_limit', 'judge_error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  judged_at timestamptz
);

CREATE INDEX IF NOT EXISTS challenge_submissions_user_created_idx
  ON public.challenge_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_submissions_judge_token_idx
  ON public.challenge_submissions (judge_token);

CREATE TABLE IF NOT EXISTS public.challenge_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_slug text NOT NULL REFERENCES public.challenges(slug) ON DELETE CASCADE,
  xp_awarded integer NOT NULL CHECK (xp_awarded > 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_slug)
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.challenges, public.challenge_submissions, public.challenge_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges, public.challenge_submissions, public.challenge_completions TO service_role;
GRANT SELECT ON public.challenge_completions TO authenticated;

DROP POLICY IF EXISTS challenge_completions_owner_read ON public.challenge_completions;
CREATE POLICY challenge_completions_owner_read ON public.challenge_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.public_api_challenges
WITH (security_barrier = true, security_invoker = false)
AS
SELECT slug, title, difficulty, description, input_format, output_format,
       sample_input, sample_output, starter_javascript, starter_python, xp_reward
FROM public.challenges
WHERE is_published = true;

CREATE OR REPLACE VIEW public.public_api_challenge_leaderboard
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  p.public_id,
  p.handle,
  p.display_name,
  count(c.challenge_slug)::integer AS challenges_solved,
  coalesce(sum(c.xp_awarded), 0)::integer AS challenge_xp,
  RANK() OVER (ORDER BY coalesce(sum(c.xp_awarded), 0) DESC, count(c.challenge_slug) DESC) AS challenge_rank
FROM public.profiles AS p
LEFT JOIN public.challenge_completions AS c ON c.user_id = p.id
WHERE p.is_public = true
GROUP BY p.id, p.public_id, p.handle, p.display_name
HAVING count(c.challenge_slug) > 0;

REVOKE ALL PRIVILEGES ON TABLE public.public_api_challenges, public.public_api_challenge_leaderboard FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.public_api_challenges, public.public_api_challenge_leaderboard TO anon, authenticated;

COMMENT ON VIEW public.public_api_challenges IS
  'Public challenge catalog allowlist. Never expose hidden_input or expected_output.';
COMMENT ON VIEW public.public_api_challenge_leaderboard IS
  'Public LeetWars challenge completions and XP for profiles explicitly opted into public visibility.';

CREATE OR REPLACE FUNCTION public.reserve_challenge_submission(
  p_user_id uuid,
  p_challenge_slug text,
  p_language text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent_count integer;
  submission_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Trusted judge authorization is required';
  END IF;
  IF p_language NOT IN ('javascript', 'python') THEN
    RAISE EXCEPTION 'Language is unavailable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.challenges WHERE slug = p_challenge_slug AND is_published = true) THEN
    RAISE EXCEPTION 'Challenge is unavailable';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  SELECT count(*)::integer INTO recent_count
  FROM public.challenge_submissions
  WHERE user_id = p_user_id AND created_at >= now() - interval '1 minute';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Submission limit reached';
  END IF;

  INSERT INTO public.challenge_submissions (user_id, challenge_slug, language, status)
  VALUES (p_user_id, p_challenge_slug, p_language, 'submitting')
  RETURNING id INTO submission_id;
  RETURN submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_challenge_completion(p_user_id uuid, p_challenge_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reward integer;
  inserted_count integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Trusted judge authorization is required';
  END IF;

  SELECT xp_reward INTO reward
  FROM public.challenges
  WHERE slug = p_challenge_slug AND is_published = true;
  IF reward IS NULL THEN
    RAISE EXCEPTION 'Challenge is unavailable';
  END IF;

  INSERT INTO public.challenge_completions (user_id, challenge_slug, xp_awarded)
  VALUES (p_user_id, p_challenge_slug, reward)
  ON CONFLICT (user_id, challenge_slug) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    RETURN reward;
  END IF;
  RETURN 0;
END;
$$;

REVOKE ALL ON FUNCTION public.award_challenge_completion(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_challenge_completion(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.reserve_challenge_submission(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_challenge_submission(uuid, text, text) TO service_role;

INSERT INTO public.challenges (
  slug, title, difficulty, description, input_format, output_format,
  sample_input, sample_output, starter_javascript, starter_python,
  hidden_input, expected_output, xp_reward, is_published
)
VALUES (
  'pair-signal',
  'Pair Signal',
  'easy',
  'For each case, find two different positions whose values add up to the target. Scan values from left to right and pair each value with the earliest earlier matching value. If no pair exists, return -1 -1. Indices are zero-based. N is at most 1000; values and target are integers from -1000000000 to 1000000000.',
  'The first line contains T, the number of cases. Each case has a line with N and target, followed by a line with N integers.',
  'Print two indices for each case, or -1 -1 when no pair exists. Print one answer per line.',
  E'2\n4 9\n2 7 11 15\n3 20\n1 2 3',
  E'0 1\n-1 -1',
  E'const fs = require("fs");\nconst data = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nlet at = 0;\nconst tests = data[at++];\nconst answers = [];\nfor (let t = 0; t < tests; t++) {\n  const n = data[at++];\n  const target = data[at++];\n  const values = data.slice(at, at + n);\n  at += n;\n  const seen = new Map();\n  let answer = [-1, -1];\n  for (let right = 0; right < values.length; right++) {\n    const left = seen.get(target - values[right]);\n    if (left !== undefined) { answer = [left, right]; break; }\n    if (!seen.has(values[right])) seen.set(values[right], right);\n  }\n  answers.push(answer.join(" "));\n}\nconsole.log(answers.join("\\n"));',
  E'import sys\ndata = list(map(int, sys.stdin.buffer.read().split()))\nat = 0\ntests = data[at]\nat += 1\nanswers = []\nfor _ in range(tests):\n    n, target = data[at], data[at + 1]\n    at += 2\n    values = data[at:at + n]\n    at += n\n    seen = {}\n    answer = (-1, -1)\n    for right, value in enumerate(values):\n        left = seen.get(target - value)\n        if left is not None:\n            answer = (left, right)\n            break\n        if value not in seen:\n            seen[value] = right\n    answers.append(f"{answer[0]} {answer[1]}")\nprint("\\n".join(answers))',
  E'4\n4 9\n2 7 11 15\n3 6\n3 2 4\n4 6\n3 3 3 3\n3 20\n1 2 3',
  E'0 1\n1 2\n0 1\n-1 -1',
  25,
  true
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
