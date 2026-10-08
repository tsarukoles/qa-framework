---
paths:
  - "pages/**/*.ts"
  - "tests/**/*.ts"
  - "evidence/**/*.ts"
---

# Test data

A ⚠️ marks a rule that can be broken without any test failing.
The line under it says what the mistake looks like and why nobody notices.

## Known seed data first
- Dev is seeded with articles, categories, products and two demo logins. Use them before you create anything.
- Read a seeded value from the page at run time, or import it. Do not hard-code a title, a slug or an id.
- ⚠️ Never edit or delete a seeded record.
  - Looks like: a test renames a seeded article. Goes unnoticed because the test passes, and everyone else's baseline has changed.

## Shared data is imported
- Shared values live in `tests/support/`. The logins are in `tests/support/users.ts`.
- ⚠️ Import shared values. Never paste them into a spec or a page object.
  - Looks like: the author email typed into a spec. Goes unnoticed because it passes, and the copies drift when the seed changes.
  - Check: a search for `codemify.test` in `pages/` and `tests/` finds only `tests/support/users.ts`.
- A new shared value gets one home in `tests/support/` and one exported name.

## Records a test creates
- Create a record only when no seeded record fits the requirement.
- Create only on dev, and only through `envGuard(action)`.
- ⚠️ Every created record has a name that starts with `qa-` and a value unique to the run, for example `qa-${Date.now()}-`.
  - Looks like: `title: 'Test article'`. Goes unnoticed because it passes alone, collides in parallel runs, and leftovers look like real data.

## Cleanup
- The test that creates a record also deletes it.
- ⚠️ Cleanup also runs after a failure. Put it in `afterEach`, in a fixture teardown or in `try/finally`.
  - Looks like: the delete is the last line of the test. Goes unnoticed because it is skipped only when the test fails, and nobody looks for leftovers then.
- Cleanup deletes only records that carry the run's own prefix.
  - Check: after the run, a search for the prefix on dev finds nothing.
- No test creates data yet. The first one that does brings its cleanup with it.
