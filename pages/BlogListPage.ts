/**
 * The blog home page: the list of published articles a visitor sees first.
 */
import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

// data-testid values verified on the live dev home page.
const ARTICLE_LIST = 'article-list';
const ARTICLE_LINK = 'article-link';

export class BlogListPage extends BasePage {
  readonly articleList: Locator;
  readonly articleLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.articleList = page.getByTestId(ARTICLE_LIST);
    this.articleLinks = this.articleList.getByTestId(ARTICLE_LINK);
  }

  async open(): Promise<void> {
    await this.goto('/');
  }
}
