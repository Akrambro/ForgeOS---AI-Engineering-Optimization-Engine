import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PythonFunctionAdapter } from '../evaluation/pythonFunctionAdapter';

void (async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forgeos-phase01-'));
  try {
  const scriptPath = join(directory, 'evaluate.py');
  await writeFile(scriptPath, `import json, sys\ncandidate = json.load(sys.stdin)\nprint(json.dumps({"objectives": {"loss": candidate["x"] ** 2}, "constraints": {"limit": candidate["x"]}, "diagnostics": {"solver_converged": True}}))\n`);

  const adapter = new PythonFunctionAdapter({ scriptPath, objectiveNames: ['loss'], constraintNames: ['limit'], evaluatorVersion: 'test-1' });
  const success = await adapter.evaluate({ x: 2 });
  assert.equal(success.status, 'SUCCEEDED');
  assert.deepEqual(success.objectives, { loss: 4 });
  assert.deepEqual(success.constraints, { limit: 2 });
  assert.equal(success.feasible, 'UNKNOWN');
  assert.equal(success.diagnostics.evaluatorVersion, 'test-1');

  const badScriptPath = join(directory, 'bad.py');
  await writeFile(badScriptPath, 'raise RuntimeError("solver failed")\n');
  const failed = await new PythonFunctionAdapter({ scriptPath: badScriptPath, objectiveNames: ['loss'] }).evaluate({ x: 2 });
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.feasible, 'UNKNOWN');
  assert.equal(failed.error?.code, 'EVALUATOR_FAILED');

  const timeoutScriptPath = join(directory, 'timeout.py');
  await writeFile(timeoutScriptPath, 'import time\ntime.sleep(0.2)\n');
  const timedOut = await new PythonFunctionAdapter({ scriptPath: timeoutScriptPath, objectiveNames: ['loss'], timeoutMs: 20 }).evaluate({ x: 2 });
  assert.equal(timedOut.status, 'TIMEOUT');
  assert.equal(timedOut.feasible, 'UNKNOWN');
  assert.equal(timedOut.error?.code, 'EVALUATOR_TIMEOUT');

    console.log('Python function adapter tests passed.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
})();
