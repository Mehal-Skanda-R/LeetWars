# LeetWars — Product decisions

## Confirmed
| Area | Decision |
|---|---|
| LeetCode sync | Scheduled automatic sync |
| Player profile visibility | Private by default |
| Authentication | Google sign-in via Supabase Auth |
| Public browsing | No account required for public content |
| Team capacity | Maximum 10 members |
| Team roles | One leader; optional co-leaders |
| Team visibility | Public or private |
| Development approach | Public MVP, then iterative releases |

## Public profile rules
- Profiles are private until the owner explicitly opts in.
- Only opted-in profiles may appear in public player search, public profile pages, and public leaderboards.
- Public APIs expose only fields needed for public display.
- Internal profile UUIDs, coins, and transaction history are not public.

## Still to decide before the corresponding feature
- Scheduled LeetCode sync frequency, provider/data source, failure handling, and rate limits.
- Whether public leaderboard ranking is by LeetCode problems solved, LeetWars XP, or separate leaderboard tabs.
- Which LeetCode fields can be reliably and permissibly collected.
- War visibility and invitation rules.
- XP/coin earning and spending rules.
