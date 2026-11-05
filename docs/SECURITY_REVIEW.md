# LeetWars security review

Review date: 5 November 2026

## Current implementation

- Anonymous Public Arena requests read only `public_api_profiles`, `public_api_leaderboard`, `public_api_teams`, and `public_api_team_members`.
- Production migrations `202611040001_private_by_default_public_views` and `202611040002_account_team_participation` filter profiles by `is_public = true`, filter public rosters to opted-in profiles, and expose narrow public views.
- Anonymous roles have no direct `SELECT` on `profiles`, `player_stats`, `teams`, or `team_members`.
- Google sign-in and account/team controls are released. Supabase applies repository migrations from `main` to production.
- The frontend uses only the Supabase publishable key. The public key is not a secret; service-role keys must never appear in the browser or in any `VITE_*` variable.
- LeetWars XP and level are the only competition metrics shown. LeetCode sync and LeetCode metrics are not implemented.
- Optional LeetCode profile URLs are constrained by a database check and an authenticated RPC, are explicitly unverified, and are exposed only in the opted-in public-profile view.
- LeetWars challenge code execution is implemented on the feature branch through authenticated Edge Functions and a Judge0 runner. Submissions and hidden tests are private; the browser does not receive runner credentials or the service-role key. The hosted runner receives user source and test input. Do not enable challenges until the reviewed migrations/functions and an HTTPS runner are configured. Never award XP from client-side checks.

## Migration 2 security boundary

- New accounts are provisioned with `is_public = false`, a generated handle, and zeroed default stats. Google display-name metadata is stored only in the private profile until the user opts into public visibility.
- `set_public_profile_visibility(boolean)` changes only the caller's profile visibility.
- `create_public_arena_team(text, text)` validates team fields, creates a public team, and adds its creator as leader in one transaction.
- `join_public_arena_team(uuid)` checks that the team is public, serializes joins by locking the team row, is safe to retry, and enforces the 10-member product limit.
- These functions run with a fixed empty search path, use fully qualified table and auth references, and are executable only by `authenticated`. They do not grant direct base-table insert privileges.
- Team names and descriptions are public. Membership does not make a player's profile public; public roster views still require profile opt-in.

## Known risks and remaining work

- Supabase Security Advisor still reports four intentional security-definer-view warnings. The views keep base-table reads private while exposing a narrow public allowlist. Do not grant anonymous base-table access to silence the warnings; periodically review view definitions and grants.
- Google OAuth credentials, provider enablement, site URL, and redirect allowlist require operator setup in Supabase Auth.
- Optional LeetCode profile-link and challenge migrations are not yet applied to production.
- Rate limits, abuse monitoring, profile-name editing, private-team management, and legal/privacy operator details remain future work.
- Scheduled LeetCode sync requires official API access and a server-side implementation. Do not scrape LeetCode or present unsourced metrics as real.

## Verification

The frontend changes pass `npm run typecheck`, `npm run build`, and `git diff --check`. No test script is configured. Database migration behavior must be smoke-tested after applying it in production because automatic Supabase preview branches are unavailable on the current plan.
