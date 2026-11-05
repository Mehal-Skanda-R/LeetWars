# LeetWars coding challenges

## Friend-group MVP

- **Pair Signal** supports JavaScript (Node.js) and Python 3.
- Public catalog data excludes hidden tests. Submissions go through authenticated Supabase Edge Functions; browser code never receives the Judge0 credential or Supabase service-role key.
- Only an `Accepted` Judge0 result can award the challenge XP, once per player.
- The initial submission limit is five per player per minute.
- Challenge XP is LeetWars-native progress, separate from LeetCode statistics.

## Zero-cost runner option

For a small friend group, the code supports either self-hosted Judge0 or the hosted Judge0 CE API through RapidAPI. Judge0's official documentation lists a free Basic plan as an option; confirm the current quota, any card requirement, and the price shown for the Judge0 CE plan before subscribing because provider plans can change. The app itself does not need a VPS for this option.

The hosted runner receives the submitted source and challenge test input. Tell players that code is sent to Judge0/RapidAPI to run. A free plan may impose quotas or become unavailable; when that happens, submissions fail with a retryable error and no XP is awarded. Do not fall back to running untrusted code in the browser or in a Supabase function.

After creating a Judge0 CE subscription on a confirmed $0 plan, set its endpoint and key as Supabase Edge Function secrets. Keep these values server-side:

```sh
supabase secrets set \
  JUDGE0_URL=https://judge0-ce.p.rapidapi.com \
  JUDGE0_RAPIDAPI_KEY=<your-RapidAPI-key> \
  JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com \
  JUDGE0_JAVASCRIPT_LANGUAGE_ID=<Node.js-language-id> \
  JUDGE0_PYTHON_LANGUAGE_ID=<Python-3-language-id> \
  LEETWARS_ORIGIN=https://leetwars-nine.vercel.app
```

Get language IDs from the selected endpoint's `/languages` response. For a self-hosted instance instead, set `JUDGE0_URL` and `JUDGE0_AUTH_TOKEN`; the functions use the `X-Auth-Token` header. When both credential types are set, the RapidAPI key takes precedence. Use HTTPS for every non-local runner.

Deploy the functions and apply migration `202611050002_native_challenges.sql` only after reviewing the exact Supabase project and the selected runner configuration:

```sh
supabase functions deploy submit-challenge
supabase functions deploy check-challenge
```

The migration adds private hidden-test/submission tables, public allowlisted catalog and leaderboard views, and a service-role-only XP award RPC. Do not apply it to production without explicitly verifying the project reference and reviewing the migration.

## Current limits

- The catalog contains one easy challenge.
- A free hosted runner is suitable only for light friend-group use and may have strict request limits, queues, or plan changes.
- Production submissions are unavailable until the migration, both Edge Functions, and runner secrets are set up.
