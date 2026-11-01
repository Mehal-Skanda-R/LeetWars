# LeetWars Phase 1 security review

Review date: 1 November 2026

## Findings corrected

| Finding in original prototype | Change |
|---|---|
| Username accepted almost any string after trimming `@` | Added 1–25 character allowlist (`A-Z`, `a-z`, `0-9`, `_`), duplicate detection, bounded input, and visible validation feedback. |
| Search text had no explicit maximum length | Capped search to 80 characters. |
| Dialog had no dialog semantics or keyboard containment | Added dialog role/ARIA relationships, Escape handling, focus placement and Tab/Shift+Tab focus containment. |
| Several controls had no explicit button type or accessible name | Added button types, labels, group names, table caption and column scopes. |
| Google Fonts loaded from a third party | Removed external font requests; use system font stacks. |
| No deployment security headers | Added Vercel CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy and COOP headers. |
| Legal routes were absent | Added `/privacy-policy`, `/terms-of-service`, and `/accessibility` draft pages. |
| No secret-handling guidance | Added `.gitignore`, `.env.example`, and security guidance. |
| Dependency versions were old and ranged | Updated direct dependencies to exact stable versions based on npm package release information available on the review date. |

## Validation performed

- TypeScript/TSX syntax transpilation: passed for `src/App.tsx`, `src/main.tsx`, and `vite.config.ts`.
- JSON parsing: passed for package, Vercel and TypeScript configuration files.
- Full typecheck/build and `npm audit`: not completed because dependency installation timed out in this environment. Run `npm install`, `npm run typecheck`, `npm run build`, and `npm audit --audit-level=high` locally before merging or deploying. Commit the generated lockfile.

## Remaining risks / production gates

- No backend exists; therefore server-side validation, database injection protection, authorization, rate limiting, secure cookies, token rotation and CSRF controls are not implemented yet.
- The current username check is client-side only and can be bypassed. Repeat the same or stricter validation on the server.
- The CSP allows inline styles for the current chart and style attributes; inline scripts and `eval` are not allowed. Review the policy when adding external APIs, analytics or other integrations.
- HSTS with `includeSubDomains` must only be enabled when all affected subdomains are HTTPS-only.
- Privacy, terms and accessibility pages are drafts with operator-specific details intentionally not invented. Obtain legal review and fill in contact/operator details before launch.
- WCAG 2.1 AA has not been certified. Perform automated and manual audits including keyboard-only, screen-reader, contrast, zoom/reflow and chart accessibility testing.
- No cookies or tracking are used in this prototype. Add consent controls only if production features require them under applicable law.
- The site currently contains fictional demo leaderboard records and does not verify that usernames correspond to real LeetCode accounts.
