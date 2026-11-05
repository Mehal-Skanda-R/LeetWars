# Release readiness — Public Arena

Last checked: 5 November 2026

## Production state

- `main` contains the Public Arena and account/team participation release. Supabase confirmed migrations `202611040001_private_by_default_public_views` and `202611040002_account_team_participation` are applied. Public views filter private profiles and grant `SELECT` only to `anon` and `authenticated`.
- The live site at `https://leetwars-nine.vercel.app` is configured for Supabase. Live checks confirmed the leaderboard and teams read public views and show empty states when there is no public data.
- Vercel Production has the Supabase URL and publishable key. A successful build still does not replace an application smoke test.
- The connected Supabase GitHub integration applies repository migrations from `main` to production. Supabase preview branches are disabled on the current plan, so a merge that adds a migration is a production database change.
- Supabase Security Advisor still reports four intentional security-definer-view warnings. Keep the allowlisted view definitions and grants narrow; do not grant anonymous access to base tables to silence the warnings.
- The account/team participation feature is released. It provisions auth users with private profiles and zeroed stats, allows owners to opt in/out of the public leaderboard, creates public teams, and lets authenticated users join public teams up to the confirmed 10-member limit.
- Google OAuth calls are implemented in the frontend. The Google provider and redirect URLs still need to be configured in Supabase Auth. No LeetCode sync/provider is configured.
- The LeetCode profile-link feature adds migration `202611050001_leetcode_profile_link.sql`. It stores a user-submitted URL and exposes it only through the public-profile view for opted-in users; it does not verify ownership or fetch stats.

## Required production setup

1. In Supabase Auth, enable Google, add the Google OAuth client credentials, set the Site URL to `https://leetwars-nine.vercel.app`, and allow that origin as a redirect URL. The Google OAuth client must allow Supabase's callback URL shown in the provider settings.
2. Review migration `202611050001_leetcode_profile_link.sql` before merging. It adds an authenticated self-service URL-setting RPC and exposes the optional unverified link only through the opted-in public-profile view.
3. If enabling coding challenges, follow `docs/CHALLENGES.md` to choose a hosted Judge0 CE plan that is confirmed $0 or configure a self-hosted runner, then set Supabase Edge Function secrets and deploy both functions. Keep credentials in Edge Function secrets.
4. Review migration `202611050002_native_challenges.sql` before merging. It creates private hidden-test/submission tables, safe public catalog and leaderboard views, and a service-role-only XP award RPC.
5. After production deployment, sign in with Google, confirm a new account is private by default, set a LeetCode profile URL, opt into the leaderboard, and verify the link appears only on the public profile. Run the challenge sample and a failing solution; verify only accepted results earn XP once.
6. Recheck the live leaderboard, teams, profile-link, and challenge pages. A successful Vercel build alone is not an application smoke test.

## Remaining limits

- Creating and joining **public** teams is included. Private-team creation, management, invitations, and co-leader actions are not part of this release.
- Google OAuth cannot be used until an operator configures the provider and credentials in Supabase Auth.
- The Vercel environment values must be set in the project's dashboard by a user with Vercel access. The Supabase publishable key is intended to be browser-visible; do not paste a service-role secret into Vercel's `VITE_*` variables.
- LeetCode scheduled sync remains unimplemented until official API access is available.
- Production challenge submissions remain unavailable until a Judge0 endpoint, Edge Function secrets, functions, and migration are configured. A VPS is not required if a hosted plan meets the $0 requirement.
- The current feature branch adds profile URL and native challenge migrations. Neither has been applied to production. See `docs/CHALLENGES.md` for hosted free-plan caveats and setup steps.
- Legal pages are drafts and require operator-specific content and review.
