/**
 * Fresh-process checks: every environment-dependent claim, proven in a brand-new Node process.
 *
 * The pin is never switched. Each case spawns its own child with its own environment, the child
 * resolves exactly once, reports one JSON line, and exits. This test process stays pinned to dev
 * throughout - no reset, no re-import trick, no mutating process.env.
 *
 * No browser, database or network, and nothing here contacts the course services: the probes only
 * resolve the target and exercise the helpers against in-memory fakes.
 */
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

import { expect, test } from '@playwright/test';

const PROBES = path.join(__dirname, 'probes');
const DEV = 'https://dev.ai-orchestration-courses.com';
const PROD = 'https://ai-orchestration-courses.com';
const WATCHED = new Set(['APP_ENV', 'BASE_URL', 'LOCAL_SANDBOX_DIR']);

type Overrides = Readonly<Record<string, string>>;

/**
 * The child's environment: the parent's, minus every watched variable, plus only this case's
 * values. Without the removal every child would inherit this process's APP_ENV=dev and the
 * "unset" cases would silently test something else. Names are matched case-insensitively because
 * Windows environment names are: a stray `app_env` would otherwise leak straight through.
 */
function childEnv(overrides: Overrides): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (!WATCHED.has(name.toUpperCase())) {
      env[name] = value;
    }
  }
  return { ...env, ...overrides };
}

/**
 * Spawn a probe and return its one JSON line. Fails loudly - exit status, stderr and all - rather
 * than letting a crashed or silent probe read as a pass.
 */
function runProbe(probe: string, overrides: Overrides, args: readonly string[] = []): unknown {
  const result = spawnSync(process.execPath, [path.join(PROBES, probe), ...args], {
    env: childEnv(overrides),
    encoding: 'utf8',
    shell: false,
    timeout: 20_000,
    windowsHide: true,
  });
  const context =
    `probe ${probe} ${JSON.stringify(overrides)} ${JSON.stringify(args)}\n` +
    `exit status ${String(result.status)}, signal ${String(result.signal)}\nstderr:\n${result.stderr}`;
  expect(result.error, context).toBeUndefined();
  expect(result.status, context).toBe(0);
  const stdout = result.stdout.trim();
  expect(stdout, context).not.toBe('');
  const lines = stdout.split(/\r?\n/);
  expect(lines, context).toHaveLength(1);
  return JSON.parse(stdout);
}

test.describe('fresh processes', { tag: '@safety' }, () => {
  test.describe('getTarget() once per process', () => {
    const accepted: ReadonlyArray<{
      readonly label: string;
      readonly env: Overrides;
      readonly expected: object;
    }> = [
      {
        label: 'absent APP_ENV selects dev',
        env: {},
        expected: { supplied: [], ok: true, env: 'dev', baseURL: DEV },
      },
      {
        label: 'APP_ENV=dev',
        env: { APP_ENV: 'dev' },
        expected: { supplied: ['APP_ENV'], ok: true, env: 'dev', baseURL: DEV },
      },
      {
        label: 'APP_ENV=prod',
        env: { APP_ENV: 'prod' },
        expected: { supplied: ['APP_ENV'], ok: true, env: 'prod', baseURL: PROD },
      },
      {
        label: 'dev with its exact canonical BASE_URL',
        env: { APP_ENV: 'dev', BASE_URL: DEV },
        expected: { supplied: ['APP_ENV', 'BASE_URL'], ok: true, env: 'dev', baseURL: DEV },
      },
      {
        label: 'prod with its exact canonical BASE_URL',
        env: { APP_ENV: 'prod', BASE_URL: PROD },
        expected: { supplied: ['APP_ENV', 'BASE_URL'], ok: true, env: 'prod', baseURL: PROD },
      },
    ];

    for (const { label, env, expected } of accepted) {
      test(`accepts ${label}`, () => {
        expect(runProbe('target-probe.ts', env)).toEqual(expected);
      });
    }

    const rejected: ReadonlyArray<{
      readonly label: string;
      readonly env: Overrides;
      readonly code: string;
    }> = [
      // '' arrives as a real empty string here - `supplied` below proves it was not dropped -
      // which is exactly what PowerShell cannot express by hand.
      { label: 'explicit empty APP_ENV', env: { APP_ENV: '' }, code: 'APP_ENV_INVALID' },
      { label: 'uppercase APP_ENV', env: { APP_ENV: 'DEV' }, code: 'APP_ENV_INVALID' },
      { label: 'whitespace APP_ENV', env: { APP_ENV: '   ' }, code: 'APP_ENV_INVALID' },
      { label: 'unknown APP_ENV', env: { APP_ENV: 'staging' }, code: 'APP_ENV_INVALID' },
      {
        label: "the other environment's address as BASE_URL",
        env: { APP_ENV: 'dev', BASE_URL: PROD },
        code: 'BASE_URL_NOT_CANONICAL',
      },
      {
        label: 'a trailing-slash BASE_URL',
        env: { APP_ENV: 'prod', BASE_URL: `${PROD}/` },
        code: 'BASE_URL_NOT_CANONICAL',
      },
      {
        label: 'LOCAL_SANDBOX_DIR',
        env: { LOCAL_SANDBOX_DIR: './sandbox' },
        code: 'LOCAL_SANDBOX_NOT_SUPPORTED',
      },
    ];

    for (const { label, env, code } of rejected) {
      test(`rejects ${label}`, () => {
        const outcome = runProbe('target-probe.ts', env) as {
          supplied: string[];
          ok: boolean;
          code: string;
        };
        expect(outcome.ok).toBe(false);
        expect(outcome.code).toBe(code);
        expect(outcome.supplied).toEqual(Object.keys(env));
      });
    }

    test('rejects an invalid BASE_URL without echoing it', () => {
      const secretShaped = 'https://preview-4c1d.internal.example.com/private?token=abc123';
      const outcome = runProbe('target-probe.ts', { APP_ENV: 'dev', BASE_URL: secretShaped }) as {
        ok: boolean;
        code: string;
        message: string;
      };
      expect(outcome.ok).toBe(false);
      expect(outcome.code).toBe('BASE_URL_NOT_CANONICAL');
      expect(outcome.message).not.toContain(secretShaped);
      expect(outcome.message).not.toContain('abc123');
      expect(outcome.message).toContain(DEV);
    });
  });

  test.describe('envGuard with an in-memory dummy action', () => {
    test('prod: throws before the action, which is never called', () => {
      // The proof is all three parts together. "It threw" alone would still pass if the guard ran
      // the action first and threw afterwards - so the counter at 0 is what carries the proof.
      expect(runProbe('guard-probe.ts', { APP_ENV: 'prod' })).toEqual({
        threw: true,
        calls: 0,
        code: 'PROD_ACTION_BLOCKED',
        name: 'EnvGuardError',
      });
    });

    test('dev: runs the action exactly once and returns its value', () => {
      expect(runProbe('guard-probe.ts', { APP_ENV: 'dev' })).toEqual({
        threw: false,
        calls: 1,
        result: 'changed',
      });
    });

    test('absent APP_ENV: behaves as dev', () => {
      expect(runProbe('guard-probe.ts', {})).toEqual({ threw: false, calls: 1, result: 'changed' });
    });

    const failsClosed: ReadonlyArray<{ readonly label: string; readonly env: Overrides; readonly code: string }> = [
      { label: 'an invalid APP_ENV', env: { APP_ENV: 'staging' }, code: 'APP_ENV_INVALID' },
      {
        label: 'a mismatched BASE_URL on prod',
        env: { APP_ENV: 'prod', BASE_URL: DEV },
        code: 'BASE_URL_NOT_CANONICAL',
      },
      {
        label: 'LOCAL_SANDBOX_DIR',
        env: { APP_ENV: 'dev', LOCAL_SANDBOX_DIR: './sandbox' },
        code: 'LOCAL_SANDBOX_NOT_SUPPORTED',
      },
    ];

    for (const { label, env, code } of failsClosed) {
      test(`fails closed on ${label}: the action is never called`, () => {
        expect(runProbe('guard-probe.ts', env)).toEqual({
          threw: true,
          calls: 0,
          code,
          name: 'TargetConfigError',
        });
      });
    }
  });

  test.describe('runIfEnv with a recording fake', () => {
    const cases: ReadonlyArray<{
      readonly label: string;
      readonly env: Overrides;
      readonly allowed: string;
      readonly expected: object;
    }> = [
      {
        label: 'prod selected, dev only: skipped, naming both',
        env: { APP_ENV: 'prod' },
        allowed: 'dev',
        expected: {
          ok: true,
          recorded: [
            { condition: true, reason: 'Allowed environments: dev. Selected environment: "prod".' },
          ],
        },
      },
      {
        label: 'prod selected, prod allowed: runs',
        env: { APP_ENV: 'prod' },
        allowed: 'prod',
        expected: {
          ok: true,
          recorded: [
            { condition: false, reason: 'Allowed environments: prod. Selected environment: "prod".' },
          ],
        },
      },
      {
        label: 'prod selected, both allowed: runs',
        env: { APP_ENV: 'prod' },
        allowed: 'dev,prod',
        expected: {
          ok: true,
          recorded: [
            {
              condition: false,
              reason: 'Allowed environments: dev, prod. Selected environment: "prod".',
            },
          ],
        },
      },
      {
        label: 'dev selected, prod only: skipped, naming both',
        env: { APP_ENV: 'dev' },
        allowed: 'prod',
        expected: {
          ok: true,
          recorded: [
            { condition: true, reason: 'Allowed environments: prod. Selected environment: "dev".' },
          ],
        },
      },
      {
        label: 'prod selected, empty list: skipped',
        env: { APP_ENV: 'prod' },
        allowed: '',
        expected: {
          ok: true,
          recorded: [
            { condition: true, reason: 'Allowed environments: none. Selected environment: "prod".' },
          ],
        },
      },
      {
        // Loud failure, not a quiet skip: an invalid environment must not look like "not allowed".
        label: 'invalid APP_ENV: throws instead of skipping',
        env: { APP_ENV: 'staging' },
        allowed: 'dev',
        expected: { ok: false, code: 'APP_ENV_INVALID', recorded: [] },
      },
    ];

    for (const { label, env, allowed, expected } of cases) {
      test(label, () => {
        expect(runProbe('runIfEnv-probe.ts', env, [allowed])).toEqual(expected);
      });
    }
  });
});
