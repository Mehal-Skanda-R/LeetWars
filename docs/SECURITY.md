# LeetWars security baseline

## Current Public Arena boundary

The React frontend supports anonymous reads from four allowlisted Supabase views. It has no authentication or browser-side write flows. The client uses only the Supabase project URL and publishable key; a publishable key is not a secret and must never be paired with broad database grants. No LeetCode sync is implemented.

## Implemented in this phase

- LeetCode handles are restricted to 1–25 ASCII letters, digits, or underscores and duplicate handles are rejected case-insensitively.
- Search input is capped at 80 characters.
- User-controlled strings are rendered as React text, never inserted with `dangerouslySetInnerHTML`.
- External font requests have been removed.
- Vercel deployment headers define CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, and a restrictive permissions policy.
- Public leaderboard, player, and team routes read only `public_api_*` views.
- `.env*` files are ignored except `.env.example`; no secrets are required by the frontend.

## Production requirements before collecting user data

1. Add a maintained backend with server-side schema validation and allowlisted fields. Use parameterized SQL queries; never concatenate user values into SQL, shell commands, or query operators.
2. Keep LeetCode integration, database credentials, signing keys, and all private tokens on the server. Never expose secrets through `VITE_*` variables.
3. Use a maintained authentication/session implementation. Session cookies must be `HttpOnly`, `Secure`, and `SameSite=Strict` where compatible with the product flow. Rotate session identifiers after authentication and privilege changes; enforce expiry and server-side revocation.
4. Protect state-changing cookie-authenticated requests with CSRF tokens and Origin/Referer validation. SameSite is defense-in-depth, not a complete CSRF strategy.
5. Apply authorization checks to every read/write operation, rate limits, request-size limits, timeouts, safe error handling, audit logging without secrets, and abuse monitoring.
6. Add database constraints and migrations for unique normalized handles, bounded strings, nonnegative counters, timestamps, retention metadata, consent records where required, and verified deletion requests. Do not collect email or other personal data unless needed and disclosed.
7. Implement a consent manager only if non-essential cookies or tracking technologies are introduced. Essential session cookies and analytics/advertising consent must be accurately classified for the applicable jurisdiction.
8. Complete legal documents with the actual operator identity, purposes, lawful bases, recipients, retention, transfers, user-rights workflow, contact details, effective dates, and applicable jurisdiction. Obtain legal review.
9. Test CSP in report-only mode before tightening or adding third-party integrations. Any required external API origin must be explicitly allowlisted; do not use wildcard sources.
10. Run dependency audit, SAST, DAST, accessibility automation and manual keyboard/screen-reader testing in CI and before every production release.

## Supabase public-view boundary

- Anonymous users have no direct `SELECT` on the base tables. Keep that restriction.
- The public views are owner-executed (`security_invoker=false`) so anonymous reads do not require granting access to base tables. Supabase Security Advisor flags this configuration because view owners bypass caller RLS. The view definitions therefore must stay narrow, explicitly filter public rows, and select only display fields. Review every change to these views and their grants.
- The connected database currently grants `anon` and `authenticated` every table privilege on the four public views, including write privileges. The migration revokes those grants (and any `PUBLIC` grants) and re-grants `SELECT` only. Do not expose the current live views until that change has been validated and applied.
- Do not silence the advisor by granting broad `SELECT` on base tables. That would expose private profile fields through direct PostgREST requests.
- The connected live project currently has older unfiltered definitions for these views. Do not route public users to that project until the privacy migration has been validated and applied through an approved release path. See `docs/RELEASE_READINESS.md`.

## CSP notes

The Vercel CSP allows inline styles because current React style attributes require them. It does not allow inline scripts or `eval`. Supabase `connect-src` is restricted to the configured project origin; change it to the exact origin when using a separate preview project. Do not use a wildcard Supabase origin. HSTS with `includeSubDomains` must only be deployed when every covered subdomain supports HTTPS.
