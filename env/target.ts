/**
 * The single source of truth for which deployed application this framework talks to.
 *
 * Two guarantees the rest of the project leans on:
 *
 *   1. `resolveTarget(settings)` is PURE. Given an explicit `settings` object it reads nothing
 *      else, caches nothing, mutates nothing, and throws deterministically. That is what keeps
 *      the safety checks runnable even when the ambient environment is the broken thing.
 *   2. `getTarget()` pins ONE target per process. To switch environments, start a new process.
 *
 * Two platform quirks worth knowing before you conclude this file is broken:
 *
 *   - In PowerShell, `$env:APP_ENV = ""` DELETES the variable instead of setting it to empty
 *     (`set APP_ENV=` does the same in cmd.exe). So the empty-string rejection below cannot be
 *     reproduced by hand at a prompt: it resolves to `dev`, correctly. That branch is covered by
 *     the pure checks in `tests/safety/` instead. A shell limitation, not a resolver bug.
 *   - `process.env` lookups are case-insensitive on Windows but case-sensitive on Linux, so
 *     `$env:app_env='prod'` would work locally and do nothing in CI. This module reads only the
 *     exact name `APP_ENV`.
 */

export type AppEnv = 'dev' | 'prod';

/** @deprecated The Week 1 name, kept so existing imports keep working. Prefer `AppEnv`. */
export type TargetEnvName = AppEnv;

/**
 * The complete input surface.
 *
 * A key counts as "supplied" if and only if its value is not `undefined` - value semantics, not
 * `hasOwnProperty`. In a test object that means an explicit `undefined` reads as "not set", while
 * `''` reads as "set but blank", which is invalid for all three keys.
 */
export interface TargetSettings {
  readonly APP_ENV?: string | undefined;
  readonly BASE_URL?: string | undefined;
  readonly LOCAL_SANDBOX_DIR?: string | undefined;
}

export interface Target {
  readonly env: AppEnv;
  readonly baseURL: string;
}

export type TargetErrorCode =
  | 'LOCAL_SANDBOX_NOT_SUPPORTED'
  | 'APP_ENV_INVALID'
  | 'BASE_URL_NOT_CANONICAL'
  | 'TARGET_ALREADY_PINNED';

export class TargetConfigError extends Error {
  readonly code: TargetErrorCode;
  /** The message without the `[env/target]` prefix, so a pinned failure can be re-wrapped once. */
  readonly detail: string;

  constructor(code: TargetErrorCode, detail: string) {
    super(`[env/target] ${detail}`);
    // Set explicitly: minifiers rename classes, and down-level emit can break the prototype
    // chain. Assert on `code` rather than `instanceof` for the same reason.
    this.name = 'TargetConfigError';
    this.code = code;
    this.detail = detail;
  }
}

/** The only two addresses this framework will ever target. */
const CANONICAL_ADDRESS = Object.freeze({
  dev: 'https://dev.ai-orchestration-courses.com',
  prod: 'https://ai-orchestration-courses.com',
} as const);

/**
 * A frozen table rather than fresh object literals: identity stays stable across calls (so `toBe`
 * holds) and no caller can mutate a `Target` that another caller is holding.
 */
const TARGETS: Readonly<Record<AppEnv, Target>> = Object.freeze({
  dev: Object.freeze({ env: 'dev', baseURL: CANONICAL_ADDRESS.dev } as const),
  prod: Object.freeze({ env: 'prod', baseURL: CANONICAL_ADDRESS.prod } as const),
});

/** The only keys that participate in pinning. Nothing else in the environment is watched. */
const WATCHED_KEYS = ['APP_ENV', 'BASE_URL', 'LOCAL_SANDBOX_DIR'] as const;

/**
 * Impure by design and by name: this is the ONLY place `process.env` is read in this project.
 * Keeping the read out of `resolveTarget` is what makes the purity claim mechanically checkable.
 */
export function readSettingsFromEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): TargetSettings {
  return {
    APP_ENV: source.APP_ENV,
    BASE_URL: source.BASE_URL,
    LOCAL_SANDBOX_DIR: source.LOCAL_SANDBOX_DIR,
  };
}

/**
 * Validate a settings object and return the target it selects. Pure for every explicitly
 * supplied `settings`; the no-argument form is the single impure edge and is used only by
 * `getTarget()` and by `playwright.config.ts`.
 */
export function resolveTarget(settings: TargetSettings = readSettingsFromEnvironment()): Target {
  // 1. A categorical refusal of a whole mode of operation, so it is checked first: someone who
  //    set this is trying to run against a local server, and an APP_ENV complaint would send
  //    them the wrong way entirely.
  if (settings.LOCAL_SANDBOX_DIR !== undefined) {
    throw new TargetConfigError(
      'LOCAL_SANDBOX_NOT_SUPPORTED',
      'LOCAL_SANDBOX_DIR is not supported. This framework only tests its two canonical deployed ' +
        'addresses and never starts a local server. Unset LOCAL_SANDBOX_DIR. The supplied path ' +
        'is deliberately not shown: a filesystem path leaks a username and directory layout ' +
        'into logs and reports.',
    );
  }

  // 2. The target itself.
  //    NEVER write `settings.APP_ENV || 'dev'` here. That folds `''` into `'dev'` and silently
  //    breaks the empty-value rule while every happy-path check still passes. Only `undefined`
  //    means "not set".
  const rawAppEnv = settings.APP_ENV === undefined ? 'dev' : settings.APP_ENV;

  //    And no `.trim()`, no `.toLowerCase()`, ever. Exact match IS the requirement, which is what
  //    makes ' dev ', 'DEV' and 'dev\r' fail. One comparison covers every invalid form.
  if (rawAppEnv !== 'dev' && rawAppEnv !== 'prod') {
    // APP_ENV is echoed on purpose, unlike the two values below. It is a closed, public,
    // two-value enum that cannot carry a secret, and without JSON quoting ' dev ' and 'dev\r'
    // are invisible on screen, which would make the padding cases impossible to debug.
    throw new TargetConfigError(
      'APP_ENV_INVALID',
      `APP_ENV must be exactly "dev" or "prod". Received: ${JSON.stringify(rawAppEnv)}. Values ` +
        'are compared exactly, with no trimming and no case-folding. Unset APP_ENV to use "dev".',
    );
  }
  const env: AppEnv = rawAppEnv;

  // 3. BASE_URL last, because the rule is defined in terms of the env chosen in step 2. Checking
  //    it first would force a weaker "matches either canonical address" test, which would accept
  //    the prod address while APP_ENV=dev.
  //    One message and one code for every rejection: the remedy is always "unset it", and
  //    classifying the bad value would mean parsing it - more code, and more chances to
  //    interpolate it by accident.
  if (settings.BASE_URL !== undefined && settings.BASE_URL !== CANONICAL_ADDRESS[env]) {
    throw new TargetConfigError(
      'BASE_URL_NOT_CANONICAL',
      `BASE_URL does not match the canonical address for APP_ENV="${env}". Expected exactly ` +
        `${CANONICAL_ADDRESS[env]} with no trailing slash, no path, no port and no query. The ` +
        'supplied BASE_URL is deliberately not shown, because it may contain credentials. Unset ' +
        'BASE_URL: this framework only targets its two canonical addresses.',
    );
  }

  return TARGETS[env];
}

type PinState =
  | { readonly status: 'ok'; readonly settings: TargetSettings; readonly target: Target }
  | {
      readonly status: 'failed';
      readonly settings: TargetSettings;
      readonly code: TargetErrorCode;
      readonly detail: string;
    };

/**
 * Module-level, therefore per process. Playwright workers are separate processes, so each pins
 * independently; they inherit `process.env`, so they agree in practice. The guarantee is "no
 * in-process switching", not "the whole run used one target".
 *
 * The tempting fix - writing the resolved value back into `process.env` so workers inherit a
 * normalised value - is refused on purpose: that is precisely the mutation this module exists to
 * detect, and it would make the drift check below unfalsifiable.
 *
 * There is deliberately no reset export. A `resetTargetPin()` would be the first thing anyone
 * reached for to switch environments mid-run, which would defeat the entire module.
 */
let pin: PinState | undefined;

/**
 * Resolve the target once and pin it for the lifetime of this process. Later calls return the
 * same `Target`, or throw if anything in the watched environment changed underneath.
 */
export function getTarget(): Target {
  const current = readSettingsFromEnvironment();

  if (pin === undefined) {
    try {
      const target = resolveTarget(current);
      pin = { status: 'ok', settings: current, target };
      return target;
    } catch (error) {
      const failure = error as TargetConfigError;
      // The failure is pinned too, so a process that failed to choose a target never chooses
      // one. No fixture can repair the run by poking `process.env` and calling again.
      pin = {
        status: 'failed',
        settings: current,
        code: failure.code,
        detail: failure.detail,
      };
      throw error; // the first throw keeps its real stack
    }
  }

  const pinned = pin;

  // Drift is compared against the RAW settings snapshot, not the resolved env. If the first call
  // resolved dev with BASE_URL unset and something later injects the dev canonical address, the
  // result is output-identical but the environment did change under the run - which is exactly
  // the bug class this pin exists to catch.
  //
  // Checked BEFORE replaying a pinned failure: if the first call died on APP_ENV=staging and
  // someone then "fixes" it in-process, the useful answer is "restart", not the stale error.
  const drifted = WATCHED_KEYS.filter((key) => current[key] !== pinned.settings[key]);
  if (drifted.length > 0) {
    // Only the key NAMES are reported, never their values.
    throw new TargetConfigError(
      'TARGET_ALREADY_PINNED',
      `The target is pinned for this process. ${drifted.join(', ')} changed after the target was ` +
        'pinned. One target per process: start a new process to switch environments.',
    );
  }

  if (pinned.status === 'failed') {
    // A fresh error, not the stored one: re-throwing the original object would make every later
    // stack trace point at the first call site.
    throw new TargetConfigError(
      pinned.code,
      `${pinned.detail} (this failure was pinned on the first getTarget() call in this process)`,
    );
  }

  return pinned.target;
}

/**
 * The selected environment, read through the one shared resolver.
 *
 * A one-line accessor on purpose: `runIfEnv` and `envGuard` both go through this door, so there is
 * visibly no second parser and no second place the environment is decided. It pins exactly like
 * `getTarget()` does, so it throws on an invalid or drifted environment rather than guessing.
 */
export function currentEnv(): AppEnv {
  return getTarget().env;
}
