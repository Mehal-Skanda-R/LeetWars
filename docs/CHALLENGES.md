# LeetWars coding challenges

## MVP behavior

- The first original challenge is **Pair Signal**, with JavaScript (Node.js) and Python 3 starter code.
- The challenge catalog view exposes only its title, statement, input/output format, examples, starter code, and XP reward. Hidden tests remain in the base table, which public roles cannot read.
- Submissions go through authenticated Supabase Edge Functions to a self-hosted Judge0 instance. The browser never receives the Judge0 token or Supabase service-role key.
- Judge0 runs the whole hidden test batch with CPU, wall-time, and memory limits. Only an `Accepted` result can call the service-role-only XP RPC.
- A player earns the challenge reward once. Public challenge rank/XP views include only players who opted into a public profile. Challenge XP is separate from LeetCode stats.
- The initial submission limit is five submissions per player per minute. Change it only with abuse controls in place.

## Judge0 hosting prerequisites

Judge0 needs a dedicated Linux host capable of running its server, worker, Postgres, and Redis services. The official deployment uses privileged server/worker containers for its sandbox. Do not put this on a shared application host or expose an unauthenticated HTTP endpoint. Use a dedicated VM, HTTPS, a strong Judge0 authentication token, database passwords, firewall rules, and monitoring. Keep the Judge0 API token in Supabase Edge Function secrets only.

Use the upstream Judge0 CE deployment instructions and a fixed release version. The upstream v1.13.1 release documents Ubuntu 22.04/Docker Compose setup and fixes critical vulnerabilities in releases through v1.13.0. Review the upstream security advisories and release notes again before deploying, then pin server and worker images to the same reviewed release instead of `latest`.

After the host is available, set these Supabase Edge Function secrets:

```sh
supabase secrets set \
  JUDGE0_URL=https://<your-judge-domain> \
  JUDGE0_AUTH_TOKEN=<the-Judge0-AUTHN_TOKEN> \
  JUDGE0_JAVASCRIPT_LANGUAGE_ID=<id-from-your-judge-languages-endpoint> \
  JUDGE0_PYTHON_LANGUAGE_ID=<id-from-your-judge-languages-endpoint> \
  LEETWARS_ORIGIN=https://leetwars-nine.vercel.app
```

The `JUDGE0_URL` must use HTTPS in production. Configure Judge0's `AUTHN_TOKEN` to match `JUDGE0_AUTH_TOKEN`; its default request header is `X-Auth-Token`. Find language IDs from the deployed instance's `/languages` endpoint rather than assuming IDs match another Judge0 host. The self-hosted instance's operator can see user-submitted source code and challenge input; disclose that to players.

Deploy the functions only after the Judge0 endpoint and secrets are ready:

```sh
supabase functions deploy submit-challenge
supabase functions deploy check-challenge
```

Then apply `202611050002_native_challenges.sql` through the reviewed Supabase migration release. Do not test hidden-test execution against production with untrusted code before the host's network isolation, authentication, CPU/memory limits, and HTTPS have been verified.

## Current limits

- The MVP catalog contains one easy challenge. Challenge XP is a small LeetWars-native score, not LeetCode progress.
- The challenge interface is present in the feature branch but submissions remain unavailable until migration `202611050002_native_challenges.sql`, both Edge Functions, and the self-hosted Judge0 secrets are deployed.
- The Supabase Production project and Vercel Production have not been changed by this feature branch.
