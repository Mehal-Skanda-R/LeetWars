# LeetWars — Product decisions

## Confirmed
| Area | Decision |
|---|---|
| LeetCode sync | Scheduled automatic sync, official API only |
| LeetCode account reference | Optional user-submitted profile URL; not verified and no stats are synced until official API access is available |
| LeetWars-native stats | Stats should come from LeetWars-hosted coding challenges, not self-reported LeetCode activity |
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
- LeetCode sync frequency and official API access details (fields, authorization, failure handling, and rate limits).
- Additional LeetWars challenge catalog, XP progression, and abuse controls beyond the initial self-hosted Judge0/JavaScript/Python setup.
- Whether leaderboards rank by LeetWars challenge results, LeetCode metrics, or separate tabs.
- War visibility and invitation rules.
- XP/coin earning and spending rules.
