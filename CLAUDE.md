# qa-framework

Playwright + TypeScript UI tests for the course applications. No Page Objects, Jira, database, MCP, or CI yet.

## Boundaries
- One target per process via `getTarget()` / `currentEnv()`. Start a new process to switch; never unpin.
- `APP_ENV` is exactly `dev` or `prod`; missing means dev. `BASE_URL` unset or exactly canonical.
- `LOCAL_SANDBOX_DIR` is rejected. No local server, no alternate target, no second env parser.
- Never echo a rejected `BASE_URL` or `LOCAL_SANDBOX_DIR` value into an error message.
- Gate env-specific tests with `runIfEnv(test, [...])`; wrap data changes in `envGuard(action)`.
- `envGuard` throws before the action on prod. Never add a dry-run or log-and-continue mode.
- One Chromium project, `testDir` `tests`, `retries: 0`, `data-testid` locators.
- No new dependencies or sample tests unless asked. Never commit secrets.
- Keep `README.md`, `.gitignore`, and the committed `package-lock.json` as they are.

## Commands
- `npm test` / `npm run test:prod` - browser tests on dev / prod (prod exits 1 until specs exist).
- `npm run test:safety` - isolated checks: pure resolver, helper fakes, fresh-process probes.
- `npm run typecheck` - `tsc --noEmit`. `npm run test:list` lists tests without running them.
- `npx playwright install chromium` - one-time browser download. Drop `--pass-with-no-tests` once real specs exist.

## Files
[env/target.ts](env/target.ts) is the only resolver; [env/runIfEnv.ts](env/runIfEnv.ts) and [env/envGuard.ts](env/envGuard.ts) read it via `currentEnv()`.
[tests/support/env.ts](tests/support/env.ts) wraps it and must never import [playwright.config.ts](playwright.config.ts).
Probes: [tests/safety/probes/](tests/safety/probes/) (imports inside `env/` need `.ts` for them). Also [tsconfig.json](tsconfig.json), [README.md](README.md).
