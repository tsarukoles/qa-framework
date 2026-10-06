/**
 * The login page: sign in through the real login form, the way a visitor would.
 *
 * login() WAITS for the sign-in to move on; it does not PROVE the sign-in worked. A wrong
 * password returns to /login with an error, so a changed address alone is not proof of sign-in.
 * The proof belongs to the calling test: an assertion on what a signed-in author can see.
 *
 * Every call signs in afresh. No login state is saved to disk or shared between tests.
 */
import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

// data-testid values verified on the live dev /login page.
const LOGIN_EMAIL = 'login-email';
const LOGIN_PASSWORD = 'login-password';
const LOGIN_SUBMIT = 'login-submit';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId(LOGIN_EMAIL);
    this.passwordInput = page.getByTestId(LOGIN_PASSWORD);
    this.submitButton = page.getByTestId(LOGIN_SUBMIT);
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto('/login');
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL((url) => url.pathname !== '/login');
  }
}
