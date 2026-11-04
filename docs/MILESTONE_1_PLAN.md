# Milestone 1 — Public Arena

## Implementation status — 4 November 2026

- Frontend browsing is implemented on `feat/public-arena-milestone-1`: leaderboard, public player pages, public teams, team detail/roster, and loading/empty/error states.
- The frontend reads only the typed `public_api_*` views and does not display fabricated LeetCode statistics.
- The privacy migration is committed but has not been applied to the connected Supabase project.
- Read-only inspection found that the connected database still has unfiltered profile and roster views, plus all privileges (including writes) granted on the public views. The migration now adds privacy filters and resets view grants to SELECT only. Treat production release as blocked until an isolated preview validates it.
- Supabase GitHub integration is configured to apply migrations to production from `main`; automatic preview branches are disabled on the current plan. Do not merge this branch as a way to test the migration.
- Details and the stepwise release sequence are in `docs/RELEASE_READINESS.md`.

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
- The existing public views currently expose every profile. They must be revised before real users are connected.
- Existing direct-table SELECT policies for `profiles` and `player_stats` now restrict authenticated users to their own rows. Preserve that boundary.
- Team pages show only public teams and their public rosters. Private team data remains unavailable to public visitors.

## Milestone 1 deliverables
1. Audit and remove demo-only actions that imply data is persisted.
2. Build a real leaderboard experience with clear empty, loading, and error states.
3. Add public player profile routes, respecting opt-in visibility.
4. Add public team directory and public team detail/roster routes.
5. Add a public Supabase data-access layer using only approved public views.
6. Add a profile visibility migration and revised public views; review SQL before applying to production.
7. Add tests/type checks and verify a Vercel preview before merging.

## Data prerequisites / blockers
- Current `profiles` has no visibility column. A migration is required (e.g. `is_public boolean NOT NULL DEFAULT false`).
- Current public views expose all profiles. Filter leaderboard/profile/member views by explicit public visibility.
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
