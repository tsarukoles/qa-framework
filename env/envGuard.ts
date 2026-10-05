/**
 * Refuse a data-changing action on prod.
 *
 *     envGuard(() => api.deleteAllDrafts());
 *
 * On prod it throws BEFORE the action is called - the action is never invoked, not invoked and
 * then reported. Elsewhere it runs the action and hands back whatever the action returns, so an
 * async action's promise comes back unchanged.
 *
 * There is deliberately no dry-run, no log-and-continue mode, and no flag or variable that lets a
 * prod call through. A guard that can be persuaded to continue is not a guard.
 */
// The `.ts` extension is required: the fresh-process probes load this file with Node's native
// TypeScript support, which does not resolve extensionless relative imports.
import { currentEnv, type AppEnv } from './target.ts';

export type EnvGuardErrorCode = 'PROD_ACTION_BLOCKED';

/**
 * A refusal, not a misconfiguration - which is why this is its own class rather than a new code
 * on `TargetConfigError`. Adding one there would widen an exported union and break any
 * exhaustive switch over `TargetErrorCode`.
 */
export class EnvGuardError extends Error {
  readonly code: EnvGuardErrorCode;
  readonly env: AppEnv;

  constructor(env: AppEnv) {
    super(
      `[env/envGuard] Refusing a data-changing action on "${env}". The action was not called. ` +
        'envGuard blocks data changes on prod and has no dry-run or override.',
    );
    this.name = 'EnvGuardError';
    this.code = 'PROD_ACTION_BLOCKED';
    this.env = env;
  }
}

/** Pure, so the decision itself is checkable for both environments without a pinned process. */
export function isDataChangeAllowed(env: AppEnv): boolean {
  return env !== 'prod';
}

/** Runs `action` only where data changes are allowed. Throws before calling it on prod. */
export function envGuard<T>(action: () => T): T {
  const env = currentEnv();
  // The order is the requirement: refuse first, and only then does the action exist at all.
  if (!isDataChangeAllowed(env)) {
    throw new EnvGuardError(env);
  }
  return action();
}
