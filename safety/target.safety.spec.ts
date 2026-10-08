/**
 * Isolated safety checks for the environment resolver.
 *
 * These are pure-function checks: every case passes an explicit settings object to
 * `resolveTarget`, so nothing here reads `process.env`, launches a browser, opens a page or
 * touches the network. That purity is what lets the whole truth table live in one file, run in
 * parallel in any order, and stay runnable even when the ambient environment is the broken thing.
 *
 * Run with `npm run test:safety`. They live in `safety/`, so the browser run never collects them.
 */
import { expect, test } from '@playwright/test';

import {
  resolveTarget,
  type TargetConfigError,
  type TargetEnvName,
  type TargetErrorCode,
  type TargetSettings,
} from '../env/target';

const DEV = 'https://dev.ai-orchestration-courses.com';
const PROD = 'https://ai-orchestration-courses.com';

/**
 * Call `resolveTarget` expecting rejection with a particular code, and hand the error back for
 * further inspection. Typing `code` as `TargetErrorCode` makes a typo a compile error rather than
 * a test that quietly asserts nothing useful.
 */
function expectRejection(settings: TargetSettings, code: TargetErrorCode): TargetConfigError {
  let error: TargetConfigError | undefined;
  try {
    resolveTarget(settings);
  } catch (thrown) {
    error = thrown as TargetConfigError;
  }
  expect(error, `expected resolveTarget to reject ${JSON.stringify(settings)}`).toBeDefined();
  expect(error?.code).toBe(code);
  return error as TargetConfigError;
}

test.describe('resolveTarget', { tag: '@safety' }, () => {
  const accepted: ReadonlyArray<{
    readonly label: string;
    readonly settings: TargetSettings;
    readonly env: TargetEnvName;
    readonly baseURL: string;
  }> = [
    { label: 'no settings at all', settings: {}, env: 'dev', baseURL: DEV },
    {
      label: 'APP_ENV explicitly undefined',
      settings: { APP_ENV: undefined },
      env: 'dev',
      baseURL: DEV,
    },
    { label: 'APP_ENV=dev', settings: { APP_ENV: 'dev' }, env: 'dev', baseURL: DEV },
    { label: 'APP_ENV=prod', settings: { APP_ENV: 'prod' }, env: 'prod', baseURL: PROD },
    {
      label: 'dev with its canonical BASE_URL',
      settings: { APP_ENV: 'dev', BASE_URL: DEV },
      env: 'dev',
      baseURL: DEV,
    },
    {
      label: 'prod with its canonical BASE_URL',
      settings: { APP_ENV: 'prod', BASE_URL: PROD },
      env: 'prod',
      baseURL: PROD,
    },
    {
      label: 'default dev with its canonical BASE_URL',
      settings: { BASE_URL: DEV },
      env: 'dev',
      baseURL: DEV,
    },
  ];

  for (const { label, settings, env, baseURL } of accepted) {
    test(`accepts ${label}`, () => {
      expect(resolveTarget(settings)).toEqual({ env, baseURL });
    });
  }

  // Missing APP_ENV means dev. Every other form - empty, whitespace, wrong case, padded, unknown,
  // or carrying a stray carriage return from a file - is rejected by one exact comparison.
  const invalidAppEnv: readonly string[] = [
    '',
    ' ',
    '   ',
    '\t',
    '\n',
    'DEV',
    'Dev',
    'PROD',
    'Prod',
    ' dev ',
    'dev ',
    ' dev',
    'dev\r',
    'staging',
    'qa',
    'local',
    'test',
    'dev prod',
    'dev,prod',
    'undefined',
    'null',
  ];

  for (const value of invalidAppEnv) {
    test(`rejects APP_ENV=${JSON.stringify(value)}`, () => {
      expectRejection({ APP_ENV: value }, 'APP_ENV_INVALID');
    });
  }

  // BASE_URL is normally unset. If supplied it must equal the selected canonical address exactly:
  // no trailing slash, no path, no query or fragment, no explicit port, no scheme downgrade, no
  // host-case variation, and never the other environment's address.
  const invalidBaseUrlForDev: readonly string[] = [
    '',
    '   ',
    `${DEV}/`,
    `${DEV}/login`,
    `${DEV}?redirect=1`,
    `${DEV}#top`,
    `${DEV}:443`,
    ` ${DEV}`,
    `${DEV} `,
    'http://dev.ai-orchestration-courses.com',
    'https://DEV.ai-orchestration-courses.com',
    'https://dev.ai-orchestration-courses.com.evil.example.com',
    'http://localhost:3000',
    'https://evil.example.com',
    PROD,
  ];

  for (const value of invalidBaseUrlForDev) {
    test(`rejects BASE_URL=${JSON.stringify(value)} under dev`, () => {
      expectRejection({ APP_ENV: 'dev', BASE_URL: value }, 'BASE_URL_NOT_CANONICAL');
    });
  }

  test('rejects the dev address while prod is selected', () => {
    expectRejection({ APP_ENV: 'prod', BASE_URL: DEV }, 'BASE_URL_NOT_CANONICAL');
  });

  for (const value of ['./sandbox', '', 'C:\\tmp\\sandbox', '/tmp/sandbox']) {
    test(`rejects LOCAL_SANDBOX_DIR=${JSON.stringify(value)}`, () => {
      expectRejection({ LOCAL_SANDBOX_DIR: value }, 'LOCAL_SANDBOX_NOT_SUPPORTED');
    });
  }

  // The order of the three checks is part of the contract, because the message a developer sees
  // has to point at the thing they actually did wrong.
  test('reports the sandbox refusal ahead of any value error', () => {
    expectRejection(
      {
        LOCAL_SANDBOX_DIR: './sandbox',
        APP_ENV: 'staging',
        BASE_URL: 'https://evil.example.com',
      },
      'LOCAL_SANDBOX_NOT_SUPPORTED',
    );
  });

  test('reports the APP_ENV error ahead of the BASE_URL error', () => {
    expectRejection(
      { APP_ENV: 'staging', BASE_URL: 'https://evil.example.com' },
      'APP_ENV_INVALID',
    );
  });

  /**
   * Rejections must never echo a supplied BASE_URL or LOCAL_SANDBOX_DIR. Playwright's HTML and
   * JSON reporters serialize `error.message` into `playwright-report/` and `test-results/`, which
   * are exactly what gets uploaded as a CI artifact - so an echoed value carrying a credential or
   * a private hostname would be persisted and shared.
   *
   * The fixtures below are deliberately secret-shaped. Blank and whitespace values are not
   * checked here because they carry nothing to leak, and `includes('')` is vacuously true.
   */
  const sensitiveBaseUrls: readonly string[] = [
    'https://user:s3cr3t-token@internal.example.com/private',
    'https://preview-9f2a1b.internal.example.com?token=abc123',
    'http://localhost:3000/admin',
  ];

  for (const value of sensitiveBaseUrls) {
    test(`never echoes the supplied BASE_URL ${JSON.stringify(value)}`, () => {
      const error = expectRejection({ APP_ENV: 'dev', BASE_URL: value }, 'BASE_URL_NOT_CANONICAL');
      expect(error.message).not.toContain(value);
      // The expected canonical address IS printed: it is hardcoded and public, and it is the
      // useful half of the diagnostic.
      expect(error.message).toContain(DEV);
    });
  }

  for (const value of ['C:\\Users\\someone\\private-sandbox', '/home/someone/private-sandbox']) {
    test(`never echoes the supplied LOCAL_SANDBOX_DIR ${JSON.stringify(value)}`, () => {
      const error = expectRejection({ LOCAL_SANDBOX_DIR: value }, 'LOCAL_SANDBOX_NOT_SUPPORTED');
      expect(error.message).not.toContain(value);
    });
  }

  test('echoes an invalid APP_ENV, quoted, so padding and control characters are visible', () => {
    // A deliberate asymmetry: APP_ENV is a closed, public, two-value enum that cannot carry a
    // secret, and without quoting ' dev ' and 'dev\r' are invisible on screen.
    expect(expectRejection({ APP_ENV: ' dev ' }, 'APP_ENV_INVALID').message).toContain('" dev "');
    expect(expectRejection({ APP_ENV: 'dev\r' }, 'APP_ENV_INVALID').message).toContain('"dev\\r"');
  });

  test('is deterministic and returns a shared frozen target', () => {
    const first = resolveTarget({ APP_ENV: 'prod' });
    const second = resolveTarget({ APP_ENV: 'prod' });
    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
  });

  test('does not mutate the settings it is given', () => {
    const settings: TargetSettings = Object.freeze({ APP_ENV: 'prod', BASE_URL: PROD });
    expect(resolveTarget(settings)).toEqual({ env: 'prod', baseURL: PROD });
    expect(settings).toEqual({ APP_ENV: 'prod', BASE_URL: PROD });
  });
});
