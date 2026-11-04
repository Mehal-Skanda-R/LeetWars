# Milestone 1 — Public Arena

## Implementation status — refreshed 4 November 2026

- Public browsing is released on `main`: leaderboard, public player pages, teams, team details, and clear loading/empty/error states.
- Production migration `202611040001_private_by_default_public_views` is applied. Public views filter profiles by opt-in, and the database grants only `SELECT` to public roles.
- Live browsing still needs the Vercel Production Supabase URL and publishable key. The site currently has no configured Supabase client.
- This follow-up adds Google sign-in UI, leaderboard opt-in, public team creation/join, account provisioning, and a ten-member join limit. Its migration applies only after it is merged to `main`.
- Supabase applies migrations to production from `main`; automatic preview branches are disabled on the current plan. Details and required configuration are in `docs/RELEASE_READINESS.md`.

## Goal
Replace the demo-only dashboard with the first real, safe public experience while keeping the production `main` branch untouched until reviewed.

## Confirmed product decisions
- LeetCode profile statistics are intended to sync on a schedule.
- Player profiles are private by default.
- Google sign-in is the only planned authentication method for the initial account flow.
- Public browsing must not require an account.
- Existing public dashboard styling is the visual starting point.
- Work happens on `feat/public-arena-milestone-1`; merge to `main` only after local and preview testing.

## Privacy model
- Add an explicit profile visibility setting, defaulting to private.
- Public profile and leaderboard queries must include only profiles explicitly opted into public visibility.
- Never expose `profiles.id`, private profile fields, coins, or transaction history through public views.
- Public views are deliberate allowlists, not general access to base tables.
- The current public views expose only opted-in profiles; keep those filters and grants intact.
- Existing direct-table SELECT policies for `profiles` and `player_stats` now restrict authenticated users to their own rows. Preserve that boundary.
- Team pages show only public teams and their public rosters. Private team data remains unavailable to public visitors.

## Milestone 1 deliverables
1. Audit and remove demo-only actions that imply data is persisted.
2. Build a real leaderboard experience with clear empty, loading, and error states.
3. Add public player profile routes, respecting opt-in visibility.
4. Add public team directory and public team detail/roster routes.
5. Add a public Supabase data-access layer using only approved public views.
6. Keep the production privacy migration and public views narrow; the follow-up participation migration must be reviewed before its production merge.
7. Add tests/type checks and verify a Vercel preview before merging.

## Data prerequisites / blockers
- The production `profiles.is_public` column defaults to false. Only profiles with explicit opt-in belong in the public profile and leaderboard views.
- Migration `202611040002_account_team_participation.sql` provisions new auth accounts and scopes leaderboard/team mutations through authenticated RPCs.
- Current `player_stats` contains XP, level and coins, but not LeetCode solved counts or difficulty breakdowns.
- The existing UI's solved counts, weekly totals, streaks, rating and activity chart are sample data. They must not be shown as real statistics.
- A separate LeetCode statistics model is needed before scheduled sync can populate solved counts, difficulty breakdowns, contest rating or activity history.
- Do not implement scraping or scheduled jobs until a stable, permitted data source and refresh policy have been evaluated. Never represent a failed or unavailable sync as successful.
- Google OAuth setup requires configuring the Google provider and redirect URLs in Supabase and the deployed app. No credentials belong in source control.

## Suggested implementation order
1. Privacy-safe database migration (review first; do not auto-apply).
2. Typed public-view client and loading/empty/error states.
3. Public leaderboard backed by real supported fields.
4. Public profile page and public team directory/detail pages.
5. Remove or relabel unsupported demo metrics and actions.
6. Add integration checks and verify production build / Vercel preview.

## Release gate
Do not merge until:
- Private profiles never appear in public queries.
- Anonymous visitors can read only the approved public views.
- No browser client can write XP, coins, or competition results directly.
- Empty and failed data states are clear and do not fall back to fabricated data.
- `npm run typecheck`, `npm run build`, and `npm audit --audit-level=high` have been run and reviewed.
