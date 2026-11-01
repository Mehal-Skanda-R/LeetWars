# LeetWars visual system

## Direction
Neo-minimalist / modern functional minimalism. The interface prioritises hierarchy, alignment, whitespace, legibility, and restrained interaction feedback.

## Tokens
- Canvas: `#101111`
- Sidebar: `#121313`
- Surface: `#151616`
- Primary text: `#f2f2ee`
- Secondary text: `#a3a5a0`
- Subtle text: `#777a75`
- Divider: `#292b29`
- Single CTA accent: `#c7f36b`
- Standard radius: `8px`; compact radius: `5px`
- Interaction timing: `180ms ease-in-out`

The accent is reserved for primary calls to action. Navigation selection, charts, badges, avatars, and comparison bars remain monochrome.

## Typography
Use a system sans-serif stack with Inter/SF Pro as preferred locally installed faces and system UI fallbacks. Do not load remote fonts. Heading sizes scale responsively; body copy remains 12–14px in the dashboard and 14–15px on legal pages.

## Component map
- `Dashboard`: application shell, navigation, dashboard sections, modal state.
- `StatCard`: reusable KPI summary.
- `ComparePanel`: side-by-side user selection and metric comparison.
- `CompareCard`: individual competitor summary within comparison.
- `LegalPage`: privacy, terms, and accessibility content shell.

## Accessibility and motion
Use semantic landmarks and labels, visible `:focus-visible` outlines, native controls, reduced-motion overrides, and responsive layouts. Complete manual keyboard and screen-reader verification before claiming WCAG conformance.
