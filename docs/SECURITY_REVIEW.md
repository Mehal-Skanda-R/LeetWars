# LeetWars security review

Review date: 4 November 2026

## Current implementation

- Anonymous Public Arena requests read only `public_api_profiles`, `public_api_leaderboard`, `public_api_teams`, and `public_api_team_members`.
- Production migration `202611040001_private_by_default_public_views` filters profiles by `is_public = true`, filters public rosters to opted-in profiles, and grants the public roles `SELECT` only on those views.
- Anonymous roles have no direct `SELECT` on `profiles`, `player_stats`, `teams`, or `team_members`.
- Google sign-in and account/team controls are implemented on the feature branch. Migration `202611040002_account_team_participation.sql` must be reviewed before merge because the connected Supabase integration applies migrations from `main` to production.
- The frontend uses only the Supabase publishable key. The public key is not a secret; service-role keys must never appear in the browser or in any `VITE_*` variable.
- LeetWars XP and level are the only competition metrics shown. LeetCode sync and LeetCode metrics are not implemented.

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
- Vercel Production currently lacks the public Supabase URL and publishable key, so public data and account actions do not work until those environment variables are configured and the app is redeployed.
- Rate limits, abuse monitoring, profile-name editing, private-team management, and legal/privacy operator details remain future work.
- Scheduled LeetCode sync requires a reliable permitted source and a server-side implementation. Do not scrape LeetCode or present unsourced metrics as real.

## Verification

The frontend changes pass `npm run typecheck`, `npm run build`, and `git diff --check`. No test script is configured. Database migration behavior must be smoke-tested after applying it in production because automatic Supabase preview branches are unavailable on the current plan.
