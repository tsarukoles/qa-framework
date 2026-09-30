/**
 * Keep a test from running in an environment it was not written for.
 *
 * Call it in a describe body (preferred), at the top of a test body, or in a `beforeEach`:
 *
 *     test.describe('dev-only checks', () => {
 *       runIfEnv(test, ['dev']);
 *       test('...', async ({ page }) => { ... });
 *     });
 *
 * In a describe body Playwright applies the skip while the file loads, as a static annotation,
 * so a skipped group runs no hook, creates no fixture and launches no browser.
 * (@playwright/test 1.61.1, lib/common/index.js, `_modifier`.)
 *
 * Under any other environment the test is marked skipped, and the reason names both the selected
 * environment and every allowed one, so a skipped run explains itself in the report.
 *
 * The selected environment comes from `currentEnv()` - the one shared resolver - never from a
 * second read of `process.env`.
 */
// The `.ts` extension is required: the fresh-process probes load this file with Node's native
// TypeScript support, which does not resolve extensionless relative imports.
import { currentEnv, type AppEnv } from './target.ts';

/**
 * The narrow slice of Playwright's `test` this helper needs. Structural on purpose: production
 * passes the real `test` (its `skip(condition: boolean, description?: string)` overload satisfies
 * this), and the isolated checks pass an in-memory fake with no browser involved.
 */
export interface SkippableTest {
  skip(condition: boolean, reason: string): void;
}

/**
 * The skip reason. Pure, so every (selected, allowed) pair - including prod-selected ones - can be
 * checked without a pinned process. Allowed names are de-duplicated and sorted so the text is
 * deterministic, and the wording stays true whether or not the test ends up skipped.
 */
export function skipReason(selected: AppEnv, allowed: readonly AppEnv[]): string {
  const names = [...new Set(allowed)].sort();
  const list = names.length > 0 ? names.join(', ') : 'none';
  return `Allowed environments: ${list}. Selected environment: "${selected}".`;
}

/** Marks the test skipped unless the selected environment is in `allowed`. */
export function runIfEnv(test: SkippableTest, allowed: readonly AppEnv[]): void {
  const selected = currentEnv();
  test.skip(!allowed.includes(selected), skipReason(selected, allowed));
}
