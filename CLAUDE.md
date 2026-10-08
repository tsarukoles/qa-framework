# qa-framework

Playwright + TypeScript UI tests for the course applications. Page Objects live in `pages/`.
This file is the short version. The details are in the rule files below.

## Targets
| `APP_ENV` | Address | Use |
|---|---|---|
| `dev` (default when unset) | `https://dev.ai-orchestration-courses.com` | Daily work. Shared site. |
| `prod` | `https://ai-orchestration-courses.com` | Read-only checks. |

- `APP_ENV` is exactly `dev` or `prod`. Leave `BASE_URL` unset.
- One target per process. Start a new process to switch.

## Teaching logins
| Role | Email | Where the values live |
|---|---|---|
| author | `author@codemify.test` | `AUTHOR` in [tests/support/users.ts](tests/support/users.ts) |
| admin | `admin@codemify.test` | Not in the repo yet. Add it to `users.ts` when a test needs it. |

Both are seeded demo accounts, shown on the dev `/login` page. Import them. Never retype them.

## Commands
- `npm test` - browser tests on dev.
- `npm run test:prod` - browser tests on prod.
- `npm run test:list` - list the browser tests without running them.
- `npm run test:safety` - isolated checks in `safety/`. No browser.
- `npm run typecheck` - `tsc --noEmit`.
- `npx playwright test` and `npx playwright test --list` cover browser tests only.
- `npx playwright install chromium` - one-time browser download.

## Always
1. No data change on prod.
2. Human approval before any write to an outside system.
3. No secrets in the repo or in output.

## Rule files
| File | Loads | Covers |
|---|---|---|
| [01-guardrails.md](.claude/rules/01-guardrails.md) | Always | Environment safety, approval gates, secrets, where checks live |
| [10-playwright-pom.md](.claude/rules/10-playwright-pom.md) | When a file in `pages/`, `tests/` or `evidence/`, or `playwright.config.ts`, is read or edited | Locators, page objects, waits, assertions, verified test ids |
| [20-data-management.md](.claude/rules/20-data-management.md) | When a file in `pages/`, `tests/` or `evidence/` is read or edited | Seed data, shared data, created records, cleanup |

The rule files are in `.claude/rules/`. A ⚠️ there marks a rule that can be broken without any test failing.

## Where things live
- [env/](env/) - the only target resolver, plus `runIfEnv` and `envGuard`.
- [pages/](pages/) - page objects. [tests/](tests/) - browser tests, and shared data in `tests/support/`.
- [safety/](safety/) - isolated checks, run with [playwright.safety.config.ts](playwright.safety.config.ts).
- [evidence/](evidence/) - saved task evidence. Do not edit it.
- [jira-seed/](jira-seed/) and [scripts/](scripts/) - the Jira seed pack. A real run writes to Jira.
