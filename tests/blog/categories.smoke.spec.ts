/**
 * Smoke check for the categories page: a signed-in training author can open /categories and see
 * the category list with at least one item.
 *
 * Dev-only by design, like home.smoke.spec.ts. runIfEnv runs in the describe body, so under any
 * other environment Playwright marks the test skipped while this file loads - the login form is
 * never opened and nothing is sent to that environment.
 */
import { expect, test } from '@playwright/test';

import { runIfEnv } from '../../env/runIfEnv';
import { loginViaUi } from '../support/auth';
import { AUTHOR } from '../support/users';

// data-testid values verified by hand on the live dev /categories page.
const CATEGORY_LIST = 'category-list';
const CATEGORY_ITEM = 'category-item';

test.describe('blog categories', () => {
  runIfEnv(test, ['dev']);

  test('a signed-in author sees the category list with at least one item', async ({ page }) => {
    await loginViaUi(page, AUTHOR);
    await page.goto('/categories');

    const list = page.getByTestId(CATEGORY_LIST);
    await expect(list).toBeVisible();
    await expect(list.getByTestId(CATEGORY_ITEM).first()).toBeVisible();
  });
});
