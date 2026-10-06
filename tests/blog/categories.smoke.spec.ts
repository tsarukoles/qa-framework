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
import { CategoriesPage } from '../../pages/CategoriesPage';
import { LoginPage } from '../../pages/LoginPage';
import { AUTHOR } from '../support/users';

test.describe('blog categories', () => {
  runIfEnv(test, ['dev']);

  test('a signed-in author sees the category list with at least one item', async ({ page }) => {
    await new LoginPage(page).login(AUTHOR.email, AUTHOR.password);
    const categories = new CategoriesPage(page);
    await categories.open();

    await expect(categories.list).toBeVisible();
    await expect(categories.items.first()).toBeVisible();
  });
});
