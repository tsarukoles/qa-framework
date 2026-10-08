/**
 * Isolated checks for runIfEnv. No browser, database or network: a recording fake stands in for
 * Playwright's `test` and captures each skip decision instead of skipping anything.
 *
 * This process is pinned to dev by `npm run test:safety`, and it stays that way. Both the allowed
 * and the skipped path are reachable under that pin because the branch depends on the `allowed`
 * argument, not on the environment. Prod-selected behaviour is proven in fresh processes
 * (freshProcess.safety.spec.ts), and prod-selected reason text through the pure `skipReason`.
 */
import { expect, test } from '@playwright/test';

import { runIfEnv, skipReason, type SkippableTest } from '../env/runIfEnv';
import { currentEnv, getTarget, type AppEnv } from '../env/target';
import * as targetViaTsSpecifier from '../env/target.ts';

type SkipCall = { condition: boolean; reason: string };

/** A stand-in for Playwright's `test` that records every skip decision it is handed. */
function recordingTest(): SkippableTest & { calls: SkipCall[] } {
  const calls: SkipCall[] = [];
  return {
    calls,
    skip(condition, reason) {
      calls.push({ condition, reason });
    },
  };
}

// Compile-time evidence rather than a runtime check: the real Playwright `test` must satisfy
// SkippableTest. If an upgrade changed test.skip's overloads, `npm run typecheck` fails right here.
test satisfies SkippableTest;

test.describe('runIfEnv', { tag: '@safety' }, () => {
  test.beforeEach(() => {
    expect(currentEnv(), 'these checks expect the dev pin that npm run test:safety selects').toBe(
      'dev',
    );
  });

  test('lets the test run when the selected environment is allowed', () => {
    const fake = recordingTest();
    runIfEnv(fake, ['dev']);
    expect(fake.calls).toEqual([
      { condition: false, reason: 'Allowed environments: dev. Selected environment: "dev".' },
    ]);
  });

  test('lets the test run when every environment is allowed', () => {
    const fake = recordingTest();
    runIfEnv(fake, ['dev', 'prod']);
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]?.condition).toBe(false);
  });

  test('skips, naming the selected and the allowed environments, when not allowed', () => {
    const fake = recordingTest();
    runIfEnv(fake, ['prod']);
    expect(fake.calls).toEqual([
      { condition: true, reason: 'Allowed environments: prod. Selected environment: "dev".' },
    ]);
    // Spelled out as well, so the requirement is visible without decoding the literal above.
    const reason = fake.calls[0]?.reason ?? '';
    expect(reason).toContain('"dev"');
    expect(reason).toContain('prod');
  });

  test('skips when the allowed list is empty, and says so', () => {
    const fake = recordingTest();
    runIfEnv(fake, []);
    expect(fake.calls).toEqual([
      { condition: true, reason: 'Allowed environments: none. Selected environment: "dev".' },
    ]);
  });

  // Every (selected, allowed) pair, prod-selected rows included, through the pure formatter.
  const reasonTable: ReadonlyArray<{
    readonly selected: AppEnv;
    readonly allowed: readonly AppEnv[];
    readonly reason: string;
  }> = [
    { selected: 'dev', allowed: [], reason: 'Allowed environments: none. Selected environment: "dev".' },
    { selected: 'dev', allowed: ['dev'], reason: 'Allowed environments: dev. Selected environment: "dev".' },
    { selected: 'dev', allowed: ['prod'], reason: 'Allowed environments: prod. Selected environment: "dev".' },
    {
      selected: 'dev',
      allowed: ['dev', 'prod'],
      reason: 'Allowed environments: dev, prod. Selected environment: "dev".',
    },
    { selected: 'prod', allowed: [], reason: 'Allowed environments: none. Selected environment: "prod".' },
    { selected: 'prod', allowed: ['dev'], reason: 'Allowed environments: dev. Selected environment: "prod".' },
    { selected: 'prod', allowed: ['prod'], reason: 'Allowed environments: prod. Selected environment: "prod".' },
    {
      selected: 'prod',
      allowed: ['dev', 'prod'],
      reason: 'Allowed environments: dev, prod. Selected environment: "prod".',
    },
  ];

  for (const { selected, allowed, reason } of reasonTable) {
    test(`skipReason for selected ${selected}, allowed [${allowed.join(', ')}]`, () => {
      expect(skipReason(selected, allowed)).toBe(reason);
    });
  }

  test('skipReason orders the allowed names so the text is deterministic', () => {
    expect(skipReason('prod', ['prod', 'dev'])).toBe(skipReason('prod', ['dev', 'prod']));
  });

  test('skipReason collapses duplicate allowed names', () => {
    expect(skipReason('prod', ['dev', 'dev'])).toBe(skipReason('prod', ['dev']));
  });

  test('helpers and specs share one resolver instance, whichever specifier imports it', () => {
    // The helpers import './target.ts' (Node's native loader needs the extension); specs import
    // '../env/target'. Two module instances would mean two independent pins - a quiet way
    // round the one-target-per-process rule - so this asserts they are the same instance.
    expect(targetViaTsSpecifier.getTarget()).toBe(getTarget());
  });
});
