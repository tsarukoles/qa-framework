import { defineConfig, devices } from '@playwright/test';

import { getTarget } from './env/target';

/**
 * Resolved at module scope, so an invalid environment aborts every subcommand - including
 * `--list` - before a single test loads. That is deliberate: catching the error here and
 * defaulting to dev would silently substitute a target, which is the exact bug `env/target.ts`
 * exists to prevent. The resolver's error message is therefore the whole user experience.
 */
const target = getTarget();

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  // No retries: a test either passes or it is a real failure worth looking at.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: target.baseURL,
    // Already Playwright's default. Stated explicitly so the locator convention is visible in
    // the config rather than only in the docs.
    testIdAttribute: 'data-testid',
    // A matched pair with `retries: 0`. The mode most examples use is 'on-first-retry', which
    // with zero retries produces no traces at all - a silent loss that is painful to diagnose.
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
