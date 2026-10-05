/**
 * Sign in through the real login form, the way a visitor would.
 *
 * loginViaUi WAITS for the sign-in to move on; it does not PROVE the sign-in worked. A wrong
 * password returns to /login with an error, so a changed address alone is not proof of sign-in.
 * The proof belongs to the calling test: an assertion on what a signed-in author can see.
 *
 * Every call signs in afresh. No login state is saved to disk or shared between tests.
 */
import type { Page } from '@playwright/test';

import type { TestUser } from './users';

// data-testid values verified by hand on the live dev /login page.
const LOGIN_EMAIL = 'login-email';
const LOGIN_PASSWORD = 'login-password';
const LOGIN_SUBMIT = 'login-submit';

export async function loginViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByTestId(LOGIN_EMAIL).fill(user.email);
  await page.getByTestId(LOGIN_PASSWORD).fill(user.password);
  await page.getByTestId(LOGIN_SUBMIT).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}
