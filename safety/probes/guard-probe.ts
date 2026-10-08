/**
 * Fresh-process probe - not a test. Spawned by safety/freshProcess.safety.spec.ts with a
 * chosen environment. It hands envGuard an in-memory dummy action that only counts its calls, then
 * prints one JSON line saying whether the guard threw and how many times the action ran.
 *
 * No database, no network: the "data change" is a counter in this process's memory.
 */
import { envGuard } from '../../env/envGuard.ts';

let calls = 0;

function dummyAction(): string {
  calls += 1;
  return 'changed';
}

try {
  const result = envGuard(dummyAction);
  console.log(JSON.stringify({ threw: false, calls, result }));
} catch (error) {
  // Either an EnvGuardError (prod refused) or a TargetConfigError (environment invalid). Both carry
  // a code, and in both cases the counter shows whether the action was reached.
  const failure = error as Error & { code?: string };
  console.log(JSON.stringify({ threw: true, calls, code: failure.code, name: failure.name }));
}
