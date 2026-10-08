# Guardrails

These rules hold in every task. This file has no `paths` line, so it always loads.

A ⚠️ marks a rule that can be broken without any test failing.
The line under it says what the mistake looks like and why nobody notices.

## Environment safety
- The target comes only from `getTarget()` / `currentEnv()` in `env/target.ts`. There is no second env parser.
- `APP_ENV` is exactly `dev` or `prod`. Missing means dev. `BASE_URL` is unset or exactly canonical.
- `LOCAL_SANDBOX_DIR` is rejected. No local server and no third target.
- One target per process. Start a new process to switch. Never unpin.
- Never echo a rejected `BASE_URL` or `LOCAL_SANDBOX_DIR` value into an error message.
- ⚠️ Every spec in `tests/` calls `runIfEnv(test, [...])` in its describe body, even when it allows both environments.
  - Looks like: a new spec without the call. Goes unnoticed because it is green on dev, and only a prod run shows it.
  - Check: every `*.spec.ts` under `tests/` contains `runIfEnv(test`.
- ⚠️ Every data change goes through `envGuard(action)`.
  - Looks like: a helper that submits a create or delete form directly. Goes unnoticed because it works on dev, and the first sign is changed data on prod.
- `envGuard` throws before the action on prod. Never add a dry-run or a log-and-continue mode.
- ⚠️ Navigate with relative paths. Never write a full site address in `pages/` or `tests/`.
  - Looks like: `goto('https://dev.ai-orchestration-courses.com/login')`. Goes unnoticed because under `APP_ENV=prod` it still tests dev and reports green.
  - Check: a search for `://` in `pages/` and `tests/` finds nothing.
- `tests/support/env.ts` must never import `playwright.config.ts`.
- Imports inside `env/` keep the `.ts` extension. The probes in `safety/probes/` need it.

## Human-approval gates
- An outside system is anything beyond this repo and the two course sites. Examples: Jira, GitHub, any MCP server that writes.
- ⚠️ Ask a human before any write to an outside system. Show the exact command and what it will change. Wait for a yes.
  - Looks like: running `node scripts/jira-seed.mjs` without `--dry-run` because the task implied it. Goes unnoticed because the command succeeds, and no diff or test shows the change.
- Run the dry run first when one exists. `node scripts/jira-seed.mjs --dry-run` is offline (see `jira-seed/README.md`).
- One approval covers one action. It does not carry over to the next one.
- `git push` always asks. `.claude/settings.json` enforces that.

## Secrets
- The only credentials in the repo are the public teaching logins in `tests/support/users.ts`.
- Never read, print or commit `.env`. `.claude/settings.json` denies reading it, and `.gitignore` ignores it.
- ⚠️ No secret in any output: chat, logs, error text, screenshots, traces, evidence files, commits.
  - Looks like: a token inside a pasted error or a saved trace. Goes unnoticed because nothing fails, and the value stays in history.
- Share an error without its credential values.
- If a secret shows up in output, stop and tell the human. Do not repeat the value.

## Where checks live
- Browser tests live in `tests/` and use `playwright.config.ts`.
- Isolated checks live in `safety/` and use `playwright.safety.config.ts`. That config has no browser project.
- `npx playwright test` and `npx playwright test --list` show browser tests only. This keeps the pass counts readable.
  - Check: every test line that `--list` prints starts with `[chromium]`.
- Isolated checks run only with `npm run test:safety`. It pins dev for the checks that need a pin.
- ⚠️ Never put an isolated check under `tests/`.
  - Looks like: a spec that never uses `page`, added under `tests/`. Goes unnoticed because everything is green, and only the count in `--list` grows.
- ⚠️ `playwright.safety.config.ts` never imports `env/target.ts`.
  - Looks like: adding `getTarget()` "to match the browser config". Goes unnoticed because every check still passes, until the resolver breaks and none of them runs.

## Repository
- No new dependencies and no sample tests unless asked.
- Keep `README.md`, `.gitignore` and the committed `package-lock.json` as they are.
- `evidence/` holds saved task evidence. Never edit a file there.
