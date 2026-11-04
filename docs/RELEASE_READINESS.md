# Release readiness — Public Arena

Last checked: 4 November 2026

## Current state

- The frontend reads public data only through the `public_api_*` views and has no browser-side write flows.
- The connected Supabase project is `leetwars`. Its GitHub integration points at `Mehal-Skanda-R/LeetWars`, with `main` selected as the production branch and production deploy enabled.
- Supabase automatic preview branches are disabled on the current plan. The dashboard says they require Pro. The Vercel integration is not connected.
- The live database currently has four `public_api_*` views, but their definitions do not filter profiles by an explicit public opt-in. The team roster view also does not filter out members with private profiles.
- Read-only grant inspection found `anon` and `authenticated` have all table privileges (including `INSERT`, `UPDATE`, and `DELETE`) on each current public view. The migration now revokes those grants from both roles and `PUBLIC`, then grants `SELECT` only.
- The Supabase dashboard reports no migrations applied. The migration in this repository has not been applied.
- Supabase Security Advisor flags the four views as security-definer views. Anonymous users currently have no direct SELECT privileges on `profiles`, `player_stats`, `teams`, or `team_members`; RLS on these tables is enabled and existing policies are scoped to authenticated users. The views intentionally provide a narrow public allowlist without granting anonymous access to those base tables. The migration documents this tradeoff and adds the missing public-visibility filters. Recheck the view definitions, grants, and advisor findings after applying it.
- No LeetCode data provider or scheduled sync is configured. A GitHub repository connection deploys Supabase project changes; it does not fetch LeetCode statistics by itself.

## Safe release sequence

1. Keep work on `feat/public-arena-milestone-1`. Pushing this branch does not create a Supabase preview database under the current integration settings.
2. Use a separate non-production Supabase project for migration validation, or enable Supabase preview branches on a plan that supports them. Do not use the current production-linked project as a test target.
3. Review and apply `supabase/migrations/202611040001_private_by_default_public_views.sql` to the non-production project. Verify that default profiles remain private; the public views return only opted-in profiles and public teams; anon still cannot select from base tables; and only the four allowlisted views have anon SELECT grants.
4. Configure Vercel Preview with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for that non-production project. The publishable key is browser-visible by design; never use a service-role key. The Vercel CSP currently allows only the configured LeetWars project URL, so update it alongside a different preview project URL.
5. Verify the public leaderboard, profile routes, teams, empty states, and errors against preview data. Do not add or display LeetCode metrics until a reliable, permitted source and scheduled job are implemented.
6. Treat merging to `main` as a production action: the connected Supabase integration is configured to apply repository database changes to production from `main`. Merge only after the preview checks pass and the operator explicitly approves the release.

## Current release blockers

- The connected live views have not yet been updated with the private-by-default filters or read-only grants. Until that migration runs, anonymous callers may be able to write through updatable views.
- There is no isolated preview database configured for this repository.
- Scheduled LeetCode sync and Google sign-in are future work, not part of this public browsing release.
- Legal, privacy, and accessibility drafts still need operator details and review before public launch.
