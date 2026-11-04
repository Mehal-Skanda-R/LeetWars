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

Fill in the Supabase project URL and publishable key in `.env.local`. Never use a Supabase `service_role` key in browser code or any `VITE_*` variable.

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

The public data access layer reads only the allowlisted `public_api_*` views. The accompanying SQL migration adds private-by-default profile visibility and filters public profile, leaderboard and team-member views. Review and apply that migration to Supabase before connecting real user data.

## Current limitations
- The existing dashboard UI still contains demo/sample records. It is not yet wired to the new public data access layer.
- The current database stores XP and level, but does not yet store LeetCode solved counts, difficulty breakdowns, contest ratings or activity history.
- Scheduled LeetCode synchronization, Google OAuth setup, profile pages, and public team pages are not yet implemented.
- Legal pages are drafts and require operator-specific content and qualified legal review before public launch.

## Security boundary
Client-side validation is for usability only. Enforce all authorization and validation in Supabase policies or trusted server-side functions. Never allow the browser to award XP/coins or submit authoritative war results. Review `docs/SECURITY.md` before launch.
