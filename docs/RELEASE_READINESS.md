# Release readiness — Public Arena

Last checked: 4 November 2026

## Production state

- `main` contains the Public Arena release. Supabase confirmed migration `202611040001_private_by_default_public_views` is applied; its public views filter private profiles and expose `SELECT` only to `anon` and `authenticated`.
- The live site at `https://leetwars-nine.vercel.app` currently fails to load public rows. Browser inspection showed the frontend has no configured Supabase client, which means the Vercel Production build is missing `VITE_SUPABASE_URL` and/or `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Vercel reported a successful deployment status for the current `main` commit, but a successful build does not confirm the required environment variables are present.
- The connected Supabase GitHub integration applies repository migrations from `main` to production. Supabase preview branches are disabled on the current plan, so a merge that adds a migration is a production database change.
- Supabase Security Advisor still reports four intentional security-definer-view warnings. Keep the allowlisted view definitions and grants narrow; do not grant anonymous access to base tables to silence the warnings.
- This feature branch adds migration `202611040002_account_team_participation.sql`. It provisions auth users with private profiles and zeroed stats, allows owners to opt in/out of the public leaderboard, creates public teams, and lets authenticated users join public teams up to the confirmed 10-member limit.
- Google OAuth calls are implemented in the frontend. The Google provider and redirect URLs still need to be configured in Supabase Auth. No LeetCode sync/provider is configured.

## Required production setup

1. In Vercel project settings, set Production environment variables:
   - `VITE_SUPABASE_URL=https://fvyhkhwhwubpeeawbakr.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=<the project's publishable key>`
   Use the publishable/anon key only; never use a `service_role` key in a browser build. Redeploy Production after saving the variables.
2. In Supabase Auth, enable Google, add the Google OAuth client credentials, set the Site URL to `https://leetwars-nine.vercel.app`, and allow that origin as a redirect URL. The Google OAuth client must allow Supabase's callback URL shown in the provider settings.
3. Review migration `202611040002_account_team_participation.sql`. Merging it to `main` applies it to production. It adds tightly scoped `SECURITY DEFINER` RPCs and an auth-user trigger; it grants no authenticated direct inserts to base tables and exposes no new anonymous database privileges.
4. After production deployment, sign in with Google, confirm a new account is private by default, explicitly join the leaderboard, create a public team, and join it from a second account. Verify the team rejects member 11 and that users who did not opt into public profiles do not appear in public rosters.
5. Recheck the live leaderboard and teams pages. A successful Vercel build alone is not an application smoke test.

## Remaining limits

- Creating and joining **public** teams is included. Private-team creation, management, invitations, and co-leader actions are not part of this release.
- Google OAuth cannot be used until an operator configures the provider and credentials in Supabase Auth.
- The Vercel environment values must be set in the project's dashboard by a user with Vercel access. The Supabase publishable key is intended to be browser-visible; do not paste a service-role secret into Vercel's `VITE_*` variables.
- LeetCode scheduled sync remains unimplemented until a reliable, permitted data source is selected.
- Legal pages are drafts and require operator-specific content and review.
