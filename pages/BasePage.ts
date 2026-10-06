/**
 * What every page of the course applications shares: the Playwright page, navigation by path,
 * and the environment banner.
 *
 * Paths are relative. They resolve against `baseURL` from playwright.config.ts, which comes from
 * env/target.ts - a page object never decides which environment it talks to.
 */
import type { Locator, Page } from '@playwright/test';

// data-testid value verified on the live dev pages.
const ENV_BANNER = 'env-banner';

export abstract class BasePage {
  readonly page: Page;
  readonly envBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.envBanner = page.getByTestId(ENV_BANNER);
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }
}
