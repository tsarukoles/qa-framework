/**
 * An article page: one published article, reached from the list on the blog home page.
 *
 * There is no open() yet. The only test that uses this page arrives by clicking a link, and the
 * address depends on the article. The comments block is left out on purpose: a script fills it in
 * after the page loads, and its form writes to the shared site.
 */
import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

// data-testid values verified on the live dev article page.
const ARTICLE_DETAIL = 'article-detail';
const ARTICLE_TITLE = 'article-title';
const ARTICLE_BODY = 'article-body';

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
