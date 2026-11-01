# LeetWars — Phase 1

Dark public LeetCode competition dashboard built with React, TypeScript, Vite, Tailwind CSS v4, Lucide React and Recharts.

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## Dependency verification
```bash
npm audit --audit-level=high
npm run typecheck
```
Commit the generated `package-lock.json` after installation so deployments use a reproducible dependency tree.

## Production build
```bash
npm run build
npm run preview
```

## Phase 1 scope
- Responsive dark dashboard
- All-time and weekly demo leaderboard views
- Search warriors
- Add placeholder warriors with strict client-side format checks
- Community activity chart and head-to-head comparison
- Legal information routes: `/privacy-policy`, `/terms-of-service`, `/accessibility`
- Vercel security headers in `vercel.json`
- Sample data only; no live LeetCode connection, backend, authentication, database, or cookies

## Security boundary
The frontend checks improve usability but do not replace server-side validation. Do not put secrets in browser code or `VITE_*` environment variables. Review `docs/SECURITY.md` and `docs/THIRD_PARTY_LICENSES.md` before adding a backend or deploying a data-collecting service. Legal pages are drafts and require operator-specific content and legal review.
