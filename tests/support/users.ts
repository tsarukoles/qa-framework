/**
 * Accounts the browser tests sign in as.
 *
 * AUTHOR is the public training account for the course applications - published course material,
 * not a private credential. Its values appear in this file and nowhere else in the repository;
 * everything else imports AUTHOR by name. No other accounts belong here.
 */

/** The two values a test needs to sign in through the login form. */
export interface TestUser {
  readonly email: string;
  readonly password: string;
}

/** The public training author account. */
export const AUTHOR: TestUser = {
  email: 'author@codemify.test',
  password: 'Author123!',
};
