/**
 * Smoke checks for the blog home page: a visitor recognises the development training site and
 * sees an article in its article list.
 *
 * Dev-only by design. `runIfEnv` runs in the describe body, so under any other environment
 * Playwright marks both tests skipped while this file loads - no hook runs, no browser starts,
 * and nothing navigates to that environment.
 *
 * The banner assertion checks what a visitor sees. It is not a safety lock: which environment
 * these tests may touch is decided by env/target.ts and runIfEnv, never by reading the page.
 */
import { expect, test } from '@playwright/test';

import { runIfEnv } from '../../env/runIfEnv';
import { BlogListPage } from '../../pages/BlogListPage';

test.describe('blog home', () => {
  runIfEnv(test, ['dev']);

  test('the banner is visible and identifies DEVELOPMENT', async ({ page }) => {
    const blogList = new BlogListPage(page);
    await blogList.open();

    const banner = blogList.envBanner;
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('DEVELOPMENT');
  });

  test('the first article card is visible and at least one card exists', async ({ page }) => {
    const blogList = new BlogListPage(page);
    await blogList.open();

    const cards = blogList.articleLinks;
    await expect(cards).not.toHaveCount(0);
    await expect(cards.first()).toBeVisible();
  });
});
