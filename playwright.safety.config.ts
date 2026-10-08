import { defineConfig } from '@playwright/test';

/**
 * Config for the isolated checks in safety/: pure resolver checks, helper fakes and fresh-process
 * probes. There is no browser project, and `npx playwright test` never collects this folder.
 *
 * This file deliberately does NOT import env/target.ts. The browser config resolves the target
 * while it loads, which is right for browser tests: a bad environment must stop all of them.
 * Here it would be wrong. These checks test the resolver, so they must still start when the
 * resolver or the environment is the broken thing. The checks that need the dev pin assert it
 * themselves and fail loudly without it.
 */
export default defineConfig({
  testDir: 'safety',
  fullyParallel: true,
  // No retries, as in the browser config: a check either passes or it is a real failure.
  retries: 0,
  // List only. The html report in playwright-report/ belongs to the browser run.
  reporter: [['list']],
  // Its own folder. With the default one, a safety run clears the traces of a failed browser run.
  outputDir: 'test-results/safety',
});
