I don't know

---

## Claude's review (appended 2026-10-07)

Everything below the line above was appended by Claude. Nothing above it was changed.

- Reviewed file: `evidence/task01-raw-draft.ts`. It is unchanged. Its SHA-256 still starts with `eb560d62` and ends with `1ebad4`.
- Rules used: `.claude/rules/10-playwright-pom.md`, `.claude/rules/01-guardrails.md`, `.claude/rules/20-data-management.md`.
- A citation like `10-playwright-pom.md:28` means line 28 of that rule file. "Draft line" means a line of the raw draft.
- Result: 1 confirmed violation, 2 optional improvements, 3 questions.

### Raw and reviewed code, side by side

Raw is `evidence/task01-raw-draft.ts`. Reviewed is `tests/blog/article-detail.smoke.spec.ts`.
The last column names the finding behind a change. "same" means the line did not change.

| Raw line | Raw code | Reviewed line | Reviewed code | Why |
|---|---|---|---|---|
| 1-12 | Header comment | 1-12 | Header comment, word for word | same |
| 13 | `import { expect, test } from '@playwright/test';` | 13 | `import { expect, test } from '@playwright/test';` | same |
| 15 | `import { runIfEnv } from '../../env/runIfEnv';` | 15 | `import { runIfEnv } from '../../env/runIfEnv';` | same |
| - | - | 16 | `import { ArticlePage } from '../../pages/ArticlePage';` | Violation 1 |
| - | - | 17 | `import { BlogListPage } from '../../pages/BlogListPage';` | Violation 1 |
| 17-22 | A comment and five test id constants: `ARTICLE_LIST`, `ARTICLE_LINK`, `ARTICLE_DETAIL`, `ARTICLE_TITLE`, `ARTICLE_BODY` | - | Removed. The ids now live in `pages/` only. | Violation 1 |
| 24 | `test.describe('blog article detail', () => {` | 19 | `test.describe('blog article detail', () => {` | same |
| 25 | `runIfEnv(test, ['dev']);` | 20 | `runIfEnv(test, ['dev']);` | same |
| 27 | `test('clicking the first article on home opens that article', async ({ page }) => {` | 22 | `test('clicking the first article on home opens that article', async ({ page }) => {` | same |
| 28 | `await page.goto('/');` | 23-24 | `const blogList = new BlogListPage(page);` then `await blogList.open();` | Optional 1 |
| 30-31 | Comment: the title and address are read from the link | 26-27 | The same comment | same |
| 32 | `const firstLink = page.getByTestId(ARTICLE_LIST).getByTestId(ARTICLE_LINK).first();` | 28 | `const firstLink = blogList.articleLinks.first();` | Violation 1 |
| 33 | `const title = (await firstLink.innerText()).trim();` | 29 | `const title = ((await firstLink.textContent()) ?? '').trim();` | Optional 2 |
| 34 | `const href = (await firstLink.getAttribute('href')) ?? '';` | 30 | `const href = (await firstLink.getAttribute('href')) ?? '';` | same |
| 35 | `expect(title).not.toBe('');` | 31 | `expect(title).not.toBe('');` | same |
| 36 | `expect(href).toMatch(/^\/articles\/.+/);` | 32 | `expect(href).toMatch(/^\/articles\/.+/);` | same |
| 38 | `await firstLink.click();` | 34 | `await firstLink.click();` | same |
| - | - | 36 | `const article = new ArticlePage(page);` | Violation 1 |
| 40 | `await expect(page).toHaveURL(href);` | 37 | `await expect(page).toHaveURL(href);` | same |
| 41 | `await expect(page.getByTestId(ARTICLE_DETAIL)).toBeVisible();` | 38 | `await expect(article.detail).toBeVisible();` | Violation 1 |
| 42 | `await expect(page.getByTestId(ARTICLE_TITLE)).toHaveText(title);` | 39 | `await expect(article.title).toHaveText(title);` | Violation 1 |
| 43 | `await expect(page.getByTestId(ARTICLE_BODY)).toBeVisible();` | 40 | `await expect(article.body).toBeVisible();` | Violation 1 |
| 44 | `await expect(page.getByTestId(ARTICLE_BODY)).toHaveText(/\S/);` | 41 | `await expect(article.body).toHaveText(/\S/);` | Violation 1 |

### New page object

`pages/ArticlePage.ts` is new. It has three fields and no methods. The test arrives on the page by a click, so it needs no `open()`.

```ts
export class ArticlePage extends BasePage {
  readonly detail: Locator;
  readonly title: Locator;
  readonly body: Locator;

  constructor(page: Page) {
    super(page);
    this.detail = page.getByTestId(ARTICLE_DETAIL);
    this.title = page.getByTestId(ARTICLE_TITLE);
    this.body = page.getByTestId(ARTICLE_BODY);
  }
}
```

`BlogListPage` did not change. Its `articleLinks` field already existed.

### Group 1: confirmed violations

1. Raw locators in the spec.
   - Draft lines: 32, 41, 42, 43 and 44. The constants on draft lines 18-22 feed them.
   - Rule broken: `10-playwright-pom.md:28`, "Zero raw locators in `tests/`".
   - Cost: the test is harder to maintain when the page changes. The check is not weaker.
   - `article-list` and `article-link` existed twice: draft lines 18-19 and `pages/BlogListPage.ts` lines 9-10.
   - The `article-body` locator was built twice inside the draft, on lines 43 and 44.
   - Fix: the spec takes `articleLinks` from `BlogListPage`. It takes `detail`, `title` and `body` from the new `ArticlePage`.

### Group 2: optional improvements

Both were approved by the owner.

1. Draft line 28: `page.goto('/')` became `blogList.open()`.
   - No rule was broken. `01-guardrails.md:20` only asks for a relative path, and line 28 used one.
   - Cost if left: the home path lives in two places, the spec and `BlogListPage.open()`.
2. Draft line 33: `innerText()` became `textContent()`.
   - No rule was broken.
   - Draft line 42 uses `toHaveText`. It compares `textContent` unless `useInnerText` is set. This was checked in the installed Playwright types.
   - So the draft compared rendered text on one side with DOM text on the other.
   - On dev on 2026-10-07 both readings gave the same string, for the link and for the article title. Neither element had a text transform.
   - Cost if left: a false failure if the card title is ever restyled, for example to upper case. The shop page already restyles its category label: `accessories` in the HTML, `Accessories` on screen.
   - This changes how the expected title is read. The expected value on dev today is the same string.

### Group 3: questions

1. The article page had no page object. Task 02 produced `BlogListPage`, `LoginPage` and `CategoriesPage` only. Which class should hold the article locators?
   - Answer from the owner: create `pages/ArticlePage.ts`. This follows `10-playwright-pom.md:24`, one class per page.
2. Should "a spec navigates through a page object" become a rule? Without it, draft line 28 is only an optional improvement.
   - Answer from the owner: no new rule now.
3. Which file name should the reviewed spec get?
   - Answer from the owner: `tests/blog/article-detail.smoke.spec.ts`, the draft's original path.

### Reason for each change

| Where | Change | Reason | Group |
|---|---|---|---|
| Reviewed lines 16-17 | Two page object imports | The spec takes its locators from page objects | Violation 1 |
| Draft lines 17-22 | Constants removed | Each test id now has one home, in `pages/` | Violation 1 |
| Reviewed lines 23-24 | `blogList.open()` replaces `page.goto('/')` | The home path stays in one place | Optional 1 |
| Reviewed line 28 | `blogList.articleLinks.first()` | No raw locator in the spec | Violation 1 |
| Reviewed line 29 | `textContent()` replaces `innerText()` | Both sides of the title check now read DOM text | Optional 2 |
| Reviewed lines 36, 38-41 | `ArticlePage` fields replace four raw locators | No raw locator in the spec | Violation 1 |
| `pages/ArticlePage.ts` | New class | One class per page, `10-playwright-pom.md:24` | Question 1 |

### Checks kept

- All seven checks of the draft are kept, with the same matchers and the same expected values.
- Draft line to reviewed line: 35 to 31, 36 to 32, 40 to 37, 41 to 38, 42 to 39, 43 to 40, 44 to 41.
- There is still one `test()`.
- `runIfEnv(test, ['dev'])` is still in the describe body, on reviewed line 20.
- The target still comes from the shared resolver. The spec has no address of its own.
- No skip was added.

### Where the draft already met a rule

- `01-guardrails.md:14`: `runIfEnv(test, ['dev'])` is in the describe body (draft line 25).
- `01-guardrails.md:20`: the draft navigates with a relative path (draft line 28). It has no full site address.
- `10-playwright-pom.md:15`: every locator uses a test id (draft lines 32 and 41-44).
- `10-playwright-pom.md:19`: there is no CSS or XPath chain.
- `10-playwright-pom.md:21`: the repeating `article-link` is scoped from `article-list` (draft line 32).
- `10-playwright-pom.md:31`: all five test ids are in the verified table, rows `:60` and `:62`.
- `10-playwright-pom.md:36`: there is no fixed wait.
- `10-playwright-pom.md:39`: the page assertions are web-first (draft lines 40-44).
- `10-playwright-pom.md:42`: the assertions match the requirement in the header: the visitor lands on that article and can read it.
- `10-playwright-pom.md:43` and `:45`: no exact count and no fixed title. The title and the address are read at run time (draft lines 33-34, 40 and 42).
- `10-playwright-pom.md:47`: nothing asserts on the comments block.
- `20-data-management.md:15`: no title, slug or id is hard-coded.
- `20-data-management.md:16`: the test is read-only. It changes no seeded record.

### Run result

The reviewed test passed on dev on its first run. Nothing had to be fixed after the run.

```text
$ npx playwright test tests/blog/article-detail.smoke.spec.ts

Running 1 test using 1 worker

  ok 1 [chromium] › tests\blog\article-detail.smoke.spec.ts:22:7 › blog article detail › clicking the first article on home opens that article (4.0s)

  1 passed (4.9s)
EXIT CODE: 0
```

Other checks run after the change:

- `npm run typecheck` exited 0.
- `npx playwright test --list` shows 4 tests in 3 files. All are `[chromium]` browser tests.
- A search for `getBy` and `locator(` in `tests/` finds nothing. This is the check in `10-playwright-pom.md:30`.
