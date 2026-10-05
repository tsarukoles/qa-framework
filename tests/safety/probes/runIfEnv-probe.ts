/**
 * Fresh-process probe - not a test. Spawned by tests/safety/freshProcess.safety.spec.ts with a
 * chosen environment. It calls runIfEnv with a recording fake instead of Playwright's `test`, then
 * prints one JSON line listing every skip decision it was handed.
 *
 * The allowed list arrives as one comma-separated argument (argv, not env, so it cannot disturb the
 * environment under test). An empty argument means an empty list.
 */
import { runIfEnv, type SkippableTest } from '../../../env/runIfEnv.ts';
import type { AppEnv } from '../../../env/target.ts';

const allowed = (process.argv[2] ?? '')
  .split(',')
  .filter((name) => name.length > 0) as AppEnv[];

const recorded: Array<{ condition: boolean; reason: string }> = [];

const recordingTest: SkippableTest = {
  skip(condition, reason) {
    recorded.push({ condition, reason });
  },
};

try {
  runIfEnv(recordingTest, allowed);
  console.log(JSON.stringify({ ok: true, recorded }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, code: (error as { code?: string }).code, recorded }));
}
