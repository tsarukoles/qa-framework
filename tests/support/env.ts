/**
 * Compatibility wrapper for test code that just wants the base address.
 *
 * It imports the shared resolver, never `playwright.config.ts` - importing the config from a test
 * would re-execute `defineConfig` inside a worker process. `env/target.ts` is the one place the
 * target is decided, for both the config and everything under `tests/`.
 */
import { getTarget } from '../../env/target';

export const baseURL = getTarget().baseURL;
