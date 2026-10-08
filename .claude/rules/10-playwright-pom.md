---
paths:
  - "pages/**/*.ts"
  - "tests/**/*.ts"
  - "evidence/**/*.ts"
  - "playwright.config.ts"
---

# Playwright and Page Objects

A ⚠️ marks a rule that can be broken without any test failing.
The line under it says what the mistake looks like and why nobody notices.

## Locator priority
1. Test id: `getByTestId('...')`. This is the default.
2. Role and name: `getByRole('button', { name: '...' })`. Use it only when the element has no test id.
3. Text: `getByText('...')`. Use it last.

- ⚠️ Never a CSS or XPath chain.
  - Looks like: `locator('.article-card > a.title')`. Goes unnoticed because it passes until the markup is restyled.
- Some test ids repeat on a page. Scope them from a parent: `articleList.getByTestId('article-link')`.

## Page objects
- One class per page in `pages/`. Each one extends `BasePage` (`page`, `goto(path)`, `envBanner`).
- Locators are `readonly` fields created in the constructor.
- Method names say what the user does: `open()`, `login(email, password)`. Not one click per method.
- `goto(path)` takes a relative path. A page object never picks a target or reads the environment.
- ⚠️ Zero raw locators in `tests/`. A spec takes its locators from a page object.
  - Looks like: `page.getByTestId('x')` in a spec. Goes unnoticed because the test passes, and it only hurts when the id changes and one copy is missed.
  - Check: a search for `getBy` and `locator(` in `tests/` finds nothing.
- Verify every test id on the live dev page before you use it. Then add it to the table below.
- ⚠️ A check that something is hidden or absent needs an id from the table below.
  - Looks like: `toBeHidden()` on a mistyped id. Goes unnoticed because a wrong id is always hidden, so the check passes forever.

## Waiting
- ⚠️ No fixed waits. Wait for a locator state or for a URL.
  - Looks like: `waitForTimeout(2000)`. Goes unnoticed because it passes, only slower, and fails on a slow day.
  - Check: a search for `waitForTimeout` in `pages/` and `tests/` finds nothing.
- Web-first assertions wait by themselves: `await expect(locator).toBeVisible()`.

## Assertions
- An assertion checks what the requirement says. No more and no less.
- ⚠️ No exact count and no fixed title for data that other people change on shared dev.
  - Looks like: `toHaveCount(6)` for the article list. Goes unnoticed because it passes until someone publishes one more article.
- Use `not.toHaveCount(0)`, or compare two values read at run time.
- Articles, categories and comments on dev can be added or removed by other people.
- The comments block on an article page is filled by `/public/app.js` after the page loads. Do not assert on it in a smoke test.

## Fixed config
- One Chromium project. `testDir` is `tests`. `retries` is `0`. The test id attribute is `data-testid`.

## Verified test ids
Read in the rendered dev pages on 2026-10-07. An id marked `*` repeats once per list row.

| Page | Test ids |
|---|---|
| Every page | `env-banner`, `brand`, `main-nav`, `nav-home`, `nav-shop`, `nav-cart`, `main-content`, `site-footer`, `footer-env`, `footer-api-docs` |
| Nav, signed out | `nav-login` |
| Nav, signed in | `nav-dashboard`, `nav-categories`, `nav-account`, `nav-logout` |
| `/` | `home-hero`, `filter-form`, `search-input`, `category-select`, `filter-submit`, `article-list`, `article-item`\*, `article-link`\*, `article-author`\*, `article-category`\*, `pagination`, `page-indicator` |
| `/` with no results | `empty-state`. `article-list` and `pagination` are absent. |
| `/articles/<slug>` | `article-detail`, `back-link`, `article-title`, `detail-author`, `detail-category`, `article-body`, `comments-section`, `comment-count`, `comments-list`, `comments-empty`, `comment-form`, `comment-errors`, `comment-name`, `comment-email`, `comment-body`, `comment-submit` |
| Unknown article slug | `error-page`, `error-code`, `error-message`, `error-home` |
| `/login` | `login-card`, `login-form`, `login-email`, `login-password`, `login-submit`, `login-hint` |
| `/categories` (signed in) | `category-form`, `category-name-input`, `category-desc-input`, `category-create`, `category-list`, `category-item`\*, `category-delete`\* |
| `/dashboard` (signed in) | `dashboard-head`, `new-article-btn`, `dashboard-table`, `dashboard-row`\*, `row-status`\*, `edit-link`\*, `delete-btn`\* |
| `/shop` | `shop-hero`, `test-store-notice`, `store-filters`, `search-input`, `filter-category`, `sort-select`, `in-stock-toggle`, `filter-submit`, `product-grid`, `product-tile`\*, `product-link`\*, `product-cat`\*, `product-price`\*, `stock-badge`\*, `pagination`, `page-indicator` |
| `/shop/<slug>` | `back-to-shop`, `product-detail`, `product-title`, `product-price`, `product-description`, `buy-form`, `variant-select`, `qty-input`, `stock-status`, `add-to-cart` |
| `/cart` (empty) | `test-store-notice`, `empty-cart` |

- The same id can mean different things on two pages: `search-input`, `filter-submit`, `pagination`, `page-indicator`, `product-price`.
- These controls submit a write: `comment-submit`, `category-create`, `category-delete`, `delete-btn`, `add-to-cart`. See `20-data-management.md` before a test uses one.
