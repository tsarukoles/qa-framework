/**
 * Smoke check for the article detail page: a visitor who clicks the first article on the blog
 * home page lands on that article and can read it.
 *
 * Dev-only by design, like home.smoke.spec.ts. runIfEnv runs in the describe body, so under any
 * other environment Playwright marks the test skipped while this file loads - no browser starts
 * and nothing navigates to that environment.
 *
 * Read-only: one page load and one click. The detail page also carries a comment form that writes
 * to the shared site, and a comments block that a script fills in after the page loads. This test
 * neither touches nor asserts on anything in that section.
 */
import { expect, test } from '@playwright/test';

import { runIfEnv } from '../../env/runIfEnv';
import { ArticlePage } from '../../pages/ArticlePage';
import { BlogListPage } from '../../pages/BlogListPage';

test.describe('blog article detail', () => {
  runIfEnv(test, ['dev']);

  test('clicking the first article on home opens that article', async ({ page }) => {
    const blogList = new BlogListPage(page);
    await blogList.open();

    // The expected title and address are read from the link itself, so no seeded article is
    // hard-coded here.
    const firstLink = blogList.articleLinks.first();
    const title = ((await firstLink.textContent()) ?? '').trim();
    const href = (await firstLink.getAttribute('href')) ?? '';
    expect(title).not.toBe('');
    expect(href).toMatch(/^\/articles\/.+/);

    await firstLink.click();

    const article = new ArticlePage(page);
    await expect(page).toHaveURL(href);
    await expect(article.detail).toBeVisible();
    await expect(article.title).toHaveText(title);
    await expect(article.body).toBeVisible();
    await expect(article.body).toHaveText(/\S/);
  });
});
