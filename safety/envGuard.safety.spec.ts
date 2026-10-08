/**
 * Isolated checks for envGuard. No browser, database or network: the "data change" is an in-memory
 * dummy action that only counts how often it is called.
 *
 * This process is pinned to dev by `npm run test:safety`, and it stays that way - it is never
 * made to pretend it is prod. The prod refusal is proven in a fresh process instead
 * (freshProcess.safety.spec.ts), and the decision itself through the pure `isDataChangeAllowed`.
 */
import { expect, test } from '@playwright/test';

import { EnvGuardError, envGuard, isDataChangeAllowed } from '../env/envGuard';
import { currentEnv } from '../env/target';

/** An in-memory stand-in for a data-changing action. */
function dummyAction<T>(value: T): { readonly action: () => T; calls: () => number } {
  let calls = 0;
  return {
    action: () => {
      calls += 1;
      return value;
    },
    calls: () => calls,
  };
}

test.describe('envGuard', { tag: '@safety' }, () => {
  test.beforeEach(() => {
    expect(currentEnv(), 'these checks expect the dev pin that npm run test:safety selects').toBe(
      'dev',
    );
  });

  test('allows data changes on dev and refuses them on prod', () => {
    expect(isDataChangeAllowed('dev')).toBe(true);
    expect(isDataChangeAllowed('prod')).toBe(false);
  });

  test('runs the action exactly once on dev and returns its value', () => {
    const dummy = dummyAction('changed');
    expect(envGuard(dummy.action)).toBe('changed');
    expect(dummy.calls()).toBe(1);
  });

  test('hands back an async action promise unchanged on dev', async () => {
    const dummy = dummyAction(Promise.resolve('changed later'));
    const returned = envGuard(dummy.action);
    expect(dummy.calls()).toBe(1);
    await expect(returned).resolves.toBe('changed later');
  });

  test("does not interfere when the action itself fails on dev", () => {
    let calls = 0;
    const failure = new Error('the action failed on its own');
    expect(() =>
      envGuard(() => {
        calls += 1;
        throw failure;
      }),
    ).toThrow(failure);
    expect(calls).toBe(1);
  });

  test('describes a refusal without echoing anything but the environment name', () => {
    const error = new EnvGuardError('prod');
    expect(error.code).toBe('PROD_ACTION_BLOCKED');
    expect(error.name).toBe('EnvGuardError');
    expect(error.env).toBe('prod');
    expect(error.message).toContain('"prod"');
    expect(error.message).toContain('was not called');
  });

  test('takes exactly one argument - there is no dry-run or options parameter', () => {
    // The real evidence here is compile-time. If anyone adds a second parameter - a dryRun flag,
    // an options bag - this call becomes valid, the directive goes unused, and
    // `npm run typecheck` fails. The function is defined but never executed.
    const neverCalled = (): void => {
      // @ts-expect-error envGuard accepts only the action
      envGuard(() => 'changed', { dryRun: true });
    };
    expect(typeof neverCalled).toBe('function');
    expect(envGuard.length).toBe(1);
  });
});
