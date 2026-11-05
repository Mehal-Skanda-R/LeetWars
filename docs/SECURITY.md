# LeetWars security baseline

## Current Public Arena boundary

The React frontend supports anonymous reads from allowlisted Supabase views and uses Google OAuth for account actions. Authenticated state changes go through narrowly scoped Supabase RPCs; the browser never receives a service-role key and does not directly insert into base tables. A publishable key is not a secret and must never be paired with broad database grants. No LeetCode sync is implemented.

## Implemented in this phase

- LeetCode handles are restricted to 1–25 ASCII letters, digits, or underscores and duplicate handles are rejected case-insensitively.
- Optional LeetCode profile URLs are constrained to HTTPS `leetcode.com` profile paths. They are user-provided, not verified, and appear in public view data only when the owning profile is opted into public visibility.
- Search input is capped at 80 characters.
- User-controlled strings are rendered as React text, never inserted with `dangerouslySetInnerHTML`.
- External font requests have been removed.
- Vercel deployment headers define CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, and a restrictive permissions policy.
- Public leaderboard, player, and team routes read only `public_api_*` views.
- New auth users receive a private profile and zeroed LeetWars stats. A player must explicitly opt into public profile visibility before appearing in public profile and leaderboard views.
- Public team creation and joining use security-definer RPCs with server-side length checks, public-team checks, idempotent joins, and a 10-member cap. The RPCs are executable by `authenticated`, not by `anon` or `PUBLIC`.
- Public roster entries remain limited to profiles that opted in; team membership alone does not make a profile public.
- LeetWars challenge code must be executed by a dedicated sandboxed judge, never by evaluating user submissions in the browser or in an unsandboxed Supabase function. Only trusted judge results may award XP.
- `.env*` files are ignored except `.env.example`; no secrets are required by the frontend.

## Production requirements before collecting user data

1. Enforce authorization and input validation in Supabase RLS/RPCs or trusted server-side functions. Use parameterized queries; never concatenate user values into SQL, shell commands, or query operators.
2. Keep LeetCode integration, database credentials, signing keys, and all private tokens on the server. Never expose secrets through `VITE_*` variables.
3. Keep the Supabase Auth session implementation maintained, enforce expiry and revocation, and never log or expose bearer tokens.
4. If adding cookie-authenticated server endpoints, protect state-changing requests with CSRF tokens and Origin/Referer validation. SameSite is defense-in-depth, not a complete CSRF strategy.
5. Apply authorization checks to every read/write operation, rate limits, request-size limits, timeouts, safe error handling, audit logging without secrets, and abuse monitoring.
6. Add database constraints and migrations for unique normalized handles, bounded strings, nonnegative counters, timestamps, retention metadata, consent records where required, and verified deletion requests. Do not collect email or other personal data unless needed and disclosed.
7. Implement a consent manager only if non-essential cookies or tracking technologies are introduced. Essential session cookies and analytics/advertising consent must be accurately classified for the applicable jurisdiction.
8. Complete legal documents with the actual operator identity, purposes, lawful bases, recipients, retention, transfers, user-rights workflow, contact details, effective dates, and applicable jurisdiction. Obtain legal review.
9. Test CSP in report-only mode before tightening or adding third-party integrations. Any required external API origin must be explicitly allowlisted; do not use wildcard sources.
10. Run dependency audit, SAST, DAST, accessibility automation and manual keyboard/screen-reader testing in CI and before every production release.

## Supabase public-view boundary

- Anonymous users have no direct `SELECT` on the base tables. Keep that restriction.
- The public views are owner-executed (`security_invoker=false`) so anonymous reads do not require granting access to base tables. Supabase Security Advisor flags this configuration because view owners bypass caller RLS. The view definitions therefore must stay narrow, explicitly filter public rows, and select only display fields. Review every change to these views and their grants.
- Before migration `202611040001_private_by_default_public_views`, `anon` and `authenticated` had every table privilege on the four public views, including write privileges. That migration is now applied in production; read access is `SELECT` only, with public opt-in filters.
- Do not silence the advisor by granting broad `SELECT` on base tables. That would expose private profile fields through direct PostgREST requests.
- Migration `202611040002_account_team_participation.sql` adds the account/team write RPCs and must be reviewed before its production merge. See `docs/RELEASE_READINESS.md`.

## CSP notes

The Vercel CSP allows inline styles because current React style attributes require them. It does not allow inline scripts or `eval`. Supabase `connect-src` is restricted to the configured project origin; change it to the exact origin when using a separate preview project. Do not use a wildcard Supabase origin. HSTS with `includeSubDomains` must only be deployed when every covered subdomain supports HTTPS.
