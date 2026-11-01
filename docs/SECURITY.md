# LeetWars security baseline

## Current Phase 1 boundary

Phase 1 is a static React frontend. It has no authentication, server, database, API credentials, session cookies, or tracking cookies. The sample leaderboard and add-warrior interaction are in-memory demo data only. Client-side validation is for usability, not a security boundary.

## Implemented in this phase

- LeetCode handles are restricted to 1–25 ASCII letters, digits, or underscores and duplicate handles are rejected case-insensitively.
- Search input is capped at 80 characters.
- User-controlled strings are rendered as React text, never inserted with `dangerouslySetInnerHTML`.
- External font requests have been removed.
- Vercel deployment headers define CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, and a restrictive permissions policy.
- Legal routes are available at `/privacy-policy`, `/terms-of-service`, and `/accessibility`.
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

## CSP notes

The Vercel CSP allows inline styles because the current chart library and React style attributes require them. It does not allow inline scripts or `eval`. Revisit this when the UI architecture changes. HSTS with `includeSubDomains` must only be deployed when every covered subdomain supports HTTPS.
