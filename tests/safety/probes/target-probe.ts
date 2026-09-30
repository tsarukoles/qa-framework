/**
 * Fresh-process probe - not a test. Spawned by tests/safety/freshProcess.safety.spec.ts with a
 * chosen environment. It resolves the target once, in a brand-new process, and prints one JSON line.
 *
 * Runs under Node's native TypeScript support, which is why imports carry the `.ts` extension.
 */
import { getTarget, readSettingsFromEnvironment, type TargetConfigError } from '../../../env/target.ts';

const settings = readSettingsFromEnvironment();

// Which watched variables this child actually received. It lets the spec prove nothing leaked in
// from the parent process, so an "unset" case genuinely exercises the absent-variable branch and
// an explicit empty string genuinely arrived as '' rather than being dropped.
const supplied = (Object.keys(settings) as Array<keyof typeof settings>).filter(
  (key) => settings[key] !== undefined,
);

try {
  const target = getTarget();
  console.log(JSON.stringify({ supplied, ok: true, env: target.env, baseURL: target.baseURL }));
} catch (error) {
  const failure = error as TargetConfigError;
  console.log(JSON.stringify({ supplied, ok: false, code: failure.code, message: failure.message }));
}
