// Python asset checks: the bundled protocol parser must accept one well-formed
// snapshot and reject a duplicate sequence. The bridge is compiled, not served.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const assets = path.join(root, 'skills', 'python-cpp-interop', 'assets')

function runPython(source) {
  const result = spawnSync('python', ['-c', source], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.error?.code === 'ENOENT') return undefined
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim().replace(/\r\n/g, '\n')
}

test('replay.py accepts a well-formed snapshot and rejects duplicate sequence', (t) => {
  const output = runPython(`
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location("replay", Path("skills/python-cpp-interop/assets/replay.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(module.parse_snapshot('{"version":1,"sequence":1,"cells":["X","O"," "," "," "," "," "," "," "],"player":"X","status":"in_progress"}')["sequence"])
try:
    module.read_snapshots([
        '{"version":1,"sequence":2,"cells":[" "," "," "," "," "," "," "," "," "],"player":"X","status":"in_progress"}',
        '{"version":1,"sequence":2,"cells":[" "," "," "," "," "," "," "," "," "],"player":"X","status":"in_progress"}',
    ])
except ValueError:
    print("strict")
`)
  if (output === undefined) {
    t.skip('python is not installed')
    return
  }
  assert.equal(output, '1\nstrict')
})

test('both Python assets compile without writing bytecode', (t) => {
  for (const file of ['replay.py', 'web_bridge.py']) {
    const result = spawnSync(
      'python',
      ['-c', 'import pathlib,sys; compile(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"), sys.argv[1], "exec")', path.join(assets, file)],
      { cwd: root, encoding: 'utf8' },
    )
    if (result.error?.code === 'ENOENT') {
      t.skip('python is not installed')
      return
    }
    assert.equal(result.status, 0, result.stderr)
  }
})
