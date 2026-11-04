# LeetWars security review

Review date: 4 November 2026

## Current implementation

- The browser has anonymous read access through `public_api_profiles`, `public_api_leaderboard`, `public_api_teams`, and `public_api_team_members` only.
- The browser uses the Supabase publishable key. No service-role key, account session, or write action is present in client code.
- Direct anonymous `SELECT` privileges are absent on `profiles`, `player_stats`, `teams`, and `team_members`. RLS is enabled on those tables; current policies are for authenticated users.
- The live `public_api_*` views grant `anon` and `authenticated` all privileges, including `INSERT`, `UPDATE`, and `DELETE`. The repository migration now explicitly revokes those privileges from both roles and `PUBLIC`, then grants only `SELECT`.
- The app displays LeetWars XP and level. It does not claim to provide LeetCode solved counts, ratings, streaks, or activity history.
- Supabase GitHub integration is connected to this repository, targets `main`, and has production deployment enabled. Supabase preview branches are disabled; Vercel integration is not connected.

## Release-blocking live-database finding

Read-only inspection of the connected Supabase project found that its existing public views are owner-executed, over-granted, and currently do not implement the agreed privacy filter:

- `public_api_profiles` returns all profile rows.
- `public_api_leaderboard` returns player stats joined to all profiles.
- `public_api_team_members` returns all members of public teams, regardless of player profile visibility.
- `public_api_teams` filters to public teams and selects only team display fields.

Supabase's dashboard reports no migrations applied. The repository migration adds `profiles.is_public NOT NULL DEFAULT false` and replaces the profile, leaderboard, and roster definitions with explicit public opt-in filters. It remains unapplied. Do not expose the current database views to public users until the migration is validated and applied through the approved release process.

The current all-privileges grants are a production security issue: `public_api_profiles` and `public_api_teams` are simple views and may be updatable. The frontend itself only issues reads, but an anonymous caller can use the publishable key outside this UI. Apply the grant revocations before any public release. No change was made to the live project during this review.

## Security Advisor finding

The Supabase dashboard flags all four views as critical security-definer views. Current anonymous roles cannot directly select from the underlying tables. This is why the views use `security_invoker=false`: switching to invoker mode would require granting base-table access, and could expose private columns through direct REST requests. The mitigation is strict allowlisting, explicit privacy filters, view-only anonymous grants, and review of each definition. This tradeoff does not make the advisor warning disappear; recheck and document it after the migration. Do not grant anonymous access to base tables just to silence the warning.

## Additional release requirements

- Create or select an isolated non-production Supabase project, since automatic preview branches are unavailable in the connected project on its current plan.
- Validate the migration and public view results in that project before any production merge.
- Keep the exact Supabase project origin in Vercel `connect-src`; do not allow all `*.supabase.co` hosts.
- Scheduled LeetCode synchronization needs a reliable, permitted source, server-side implementation, refresh/failure policy, and storage model. None is configured yet.
- Google sign-in requires provider and redirect configuration, plus user-facing privacy controls. It is not required for anonymous public browsing.
- Finish operator-specific legal/privacy text and conduct accessibility, CSP, and application testing before a public launch.

## Verification

The frontend changes passed `npm run typecheck`, `npm run build`, `npm audit --audit-level=high`, and `git diff --check` before this documentation update. No test script is configured. Repeat those checks after implementation changes and test public views against isolated preview data.
