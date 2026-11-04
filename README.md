# LeetWars

A dark, desktop-first LeetCode competition hub built with React, TypeScript, Vite, Tailwind CSS v4, Supabase and Recharts.

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in the Supabase project URL and publishable key for an isolated, non-production project in `.env.local`. Never point a local or preview build at the current live project until its public views and grants have been fixed. Never use a Supabase `service_role` key in browser code or any `VITE_*` variable.

## Verification
```bash
npm run typecheck
npm run build
npm audit --audit-level=high
```

## Product decisions
- Public browsing does not require an account.
- Player profiles are private by default; players must explicitly opt in to public discovery.
- Google sign-in is the planned initial authentication method.
- LeetCode statistics are intended to refresh on a schedule, subject to a reliable and permitted data source.
- Public teams and their public rosters may be discoverable; private team data must remain private.
- The first public release is an iterative MVP. Features must not be represented as working until implemented and tested.

## Milestone 1
See:
- `docs/PRODUCT_DECISIONS.md`
- `docs/MILESTONE_1_PLAN.md`

The public data access layer reads only the allowlisted `public_api_*` views. Migration `202611040001_private_by_default_public_views.sql` was applied to the production-linked Supabase project through the `main` release. Migration `202611040002_account_team_participation.sql` adds Google-account provisioning, explicit leaderboard opt-in, public team creation, and capped team joining; it is pending release from the current feature branch. Read `docs/RELEASE_READINESS.md` before merging because `main` applies database migrations to production.

## Current limitations
- The public leaderboard, player profiles, team directory, and team detail pages read from the allowlisted public views.
- Google sign-in, joining the leaderboard, and public team create/join actions are implemented in the frontend and require migration `202611040002...` plus Google provider setup in Supabase Auth.
- The current Vercel production deployment is missing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; public data and account actions remain unavailable until those Production environment variables are set and redeployed.
- The current database stores LeetWars XP and level, but does not store LeetCode solved counts, difficulty breakdowns, contest ratings, or activity history.
- Scheduled LeetCode synchronization is not implemented. No reliable, permitted LeetCode data source has been selected.
- The connected Supabase GitHub integration targets `main` and production. Automatic Supabase preview branches are not enabled; Vercel builds are connected but the Production Supabase environment variables are missing.
- Legal pages are drafts and require operator-specific content and qualified legal review before public launch.

## Security boundary
Client-side validation is for usability only. Enforce all authorization and validation in Supabase policies or trusted server-side functions. Never allow the browser to award XP/coins or submit authoritative war results. Review `docs/SECURITY.md` before launch.
