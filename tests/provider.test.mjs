// Provider tests: the marker gate, candidate shape and get() confinement.
// No C++ toolchain is needed: the gate is the project-skill marker, and the
// skills themselves are packaged Markdown. CMake/C++ evidence is deliberately
// not required, so an empty or freshly copied project still sees the workflow.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from '../lib/index.js'
import {
  findProjectSkill,
  isCppWorkflowWorkspace,
} from '../lib/workspace.js'

function makeProvider(config) {
  let provider
  apply(
    {
      skills: {
        registerProvider(factory) {
          provider = factory()
        },
      },
    },
    config,
  )
  assert.ok(provider, 'apply() must register a provider')
  return provider
}

async function makeTemp() {
  return mkdtemp(path.join(tmpdir(), 'dsh-cpp-workflow-'))
}

const PROJECT_SKILL = ['.agents', 'skills', 'cpp-workflow-project', 'SKILL.md']
const PROJECT_ENVIRONMENT = ['.agents', 'skills', 'cpp-workflow-project', 'environment.json']

async function addProjectSkill(root, content = '---\nname: cpp-workflow-project\ndescription: test project\n---\n') {
  const file = path.join(root, ...PROJECT_SKILL)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, content, 'utf8')
  await writeFile(path.join(root, ...PROJECT_ENVIRONMENT), '{"host":"linux","build_host":"native","compiler":"clang"}\n', 'utf8')
}

async function addCppProject(root) {
  await writeFile(path.join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.28)\nproject(demo LANGUAGES CXX)\n', 'utf8')
  await mkdir(path.join(root, 'src'), { recursive: true })
  await writeFile(path.join(root, 'src', 'main.cpp'), 'int main() { return 0; }\n', 'utf8')
}

async function makeRepo({ git = true, projectSkill = true, cpp = false } = {}) {
  const root = await makeTemp()
  if (git) await mkdir(path.join(root, '.git'))
  if (projectSkill) await addProjectSkill(root)
  if (cpp) await addCppProject(root)
  return root
}

test('no cwd means no candidates', async () => {
  const provider = makeProvider()
  assert.deepEqual(await provider.list({}), [])
  assert.deepEqual(await provider.list({ cwd: '' }), [])
  assert.deepEqual(await provider.list({ cwd: undefined }), [])
})

test('a non-git directory is not a workspace even with the full project skill', async () => {
  const root = await makeRepo({ git: false, cpp: true })
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('CMake plus C++ source does not opt in without the project skill', async () => {
  const root = await makeRepo({ projectSkill: false, cpp: true })
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('the project skill alone opts in, even in a documentation-only repository', async () => {
  const root = await makeRepo()
  await writeFile(path.join(root, 'README.md'), '# docs only\n', 'utf8')
  const provider = makeProvider()
  const candidates = await provider.list({ cwd: root })
  assert.deepEqual(candidates.map((candidate) => candidate.name), ['building-cpp', 'configuring-cmake', 'developing-cpp'])
  await rm(root, { recursive: true, force: true })
})

test('the project skill alone opts in before any CMake or source file exists', async () => {
  const root = await makeRepo()
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: root })).length, 3)
  await rm(root, { recursive: true, force: true })
})

test('C++ header evidence does not change an existing marker opt-in', async () => {
  const root = await makeRepo()
  await mkdir(path.join(root, 'include'), { recursive: true })
  await writeFile(
    path.join(root, 'include', 'demo.h'),
    '#ifndef DEMO_INCLUDE_DEMO_H_\n#define DEMO_INCLUDE_DEMO_H_\n#endif\n',
    'utf8',
  )
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: root })).length, 3)
  await rm(root, { recursive: true, force: true })
})

test('C source evidence does not change an existing marker opt-in', async () => {
  const root = await makeRepo()
  await writeFile(path.join(root, 'legacy.c'), 'int main(void) { return 0; }\n', 'utf8')
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: root })).length, 3)
  await rm(root, { recursive: true, force: true })
})

test('marker above a nested component opts in', async () => {
  const root = await makeRepo()
  const nested = path.join(root, 'games', 'ttt')
  await mkdir(nested, { recursive: true })
  await addCppProject(nested)
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: nested })).length, 3)
  await rm(root, { recursive: true, force: true })
})

test('a marker only below the session cwd does not opt in at the repo root', async () => {
  const root = await makeRepo({ projectSkill: false, cpp: true })
  const sub = path.join(root, 'game')
  await addProjectSkill(sub)
  await addCppProject(sub)
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  assert.equal((await provider.list({ cwd: sub })).length, 3)
  await rm(root, { recursive: true, force: true })
})

test('marker in a subdirectory opts in from that subdirectory', async () => {
  const root = await makeRepo({ projectSkill: false })
  const game = path.join(root, 'game')
  await addProjectSkill(game)
  const sibling = path.join(root, 'other')
  await mkdir(path.join(sibling, 'src'), { recursive: true })
  await writeFile(path.join(sibling, 'CMakeLists.txt'), 'project(other LANGUAGES CXX)\n', 'utf8')
  await writeFile(path.join(sibling, 'src', 'main.cpp'), 'int main() { return 0; }\n', 'utf8')
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: game })).length, 3)
  await rm(root, { recursive: true, force: true })
})

test('generated and dependency directories do not opt in without the marker', async () => {
  const root = await makeRepo({ projectSkill: false })
  for (const skipped of ['build', 'node_modules', 'vendor', 'third_party', 'templates', 'temp', '.cache', '.git']) {
    const dir = path.join(root, skipped, 'nested')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'CMakeLists.txt'), 'project(skipped LANGUAGES CXX)\n', 'utf8')
    await writeFile(path.join(dir, 'main.cpp'), 'int main() { return 0; }\n', 'utf8')
  }
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('C++ evidence above the git root does not affect the marker', async () => {
  const parent = await makeTemp()
  await addCppProject(parent)
  const root = path.join(parent, 'repo')
  await mkdir(root)
  await mkdir(path.join(root, '.git'))
  await addProjectSkill(root)
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: root })).length, 3)
  await rm(parent, { recursive: true, force: true })
})

test('a project skill above the git root does not opt in', async () => {
  const parent = await makeTemp()
  await addProjectSkill(parent)
  await addCppProject(parent)
  const root = path.join(parent, 'repo')
  await mkdir(root)
  await mkdir(path.join(root, '.git'))
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(parent, { recursive: true, force: true })
})

test('a marker in a sibling directory is not found from this cwd', async () => {
  const root = await makeRepo({ projectSkill: false })
  const here = path.join(root, 'here')
  const other = path.join(root, 'other')
  await mkdir(here)
  await addProjectSkill(other)
  await addCppProject(other)
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: here }), [])
  await rm(root, { recursive: true, force: true })
})

test('findProjectSkill returns the directory that owns the marker', async () => {
  const root = await makeRepo()
  const nested = path.join(root, 'src', 'core')
  await mkdir(nested, { recursive: true })
  const marker = await findProjectSkill(nested)
  assert.equal(marker?.root, root)
  assert.equal(marker?.file, path.join(root, ...PROJECT_SKILL))
  await rm(root, { recursive: true, force: true })
})

test('findProjectSkill refuses a gitRoot that is not an ancestor', async () => {
  const root = await makeRepo()
  const nested = path.join(root, 'src', 'core')
  const sibling = path.join(root, 'sibling')
  await mkdir(nested, { recursive: true })
  await mkdir(sibling)
  assert.equal(await findProjectSkill(nested, sibling), undefined)
  await rm(root, { recursive: true, force: true })
})

test('all three skills expose rank 550, bundled source and a directory resource base', async () => {
  const root = await makeRepo({ cpp: true })
  const provider = makeProvider()
  const candidates = await provider.list({ cwd: root })

  assert.deepEqual(candidates.map((candidate) => candidate.name), ['building-cpp', 'configuring-cmake', 'developing-cpp'])
  for (const candidate of candidates) {
    assert.equal(candidate.rank, 550)
    assert.equal(candidate.provider, 'dsh-cpp-workflow')
    assert.equal(candidate.source, 'bundled')
    assert.equal(candidate.resourceBase.kind, 'directory')
    assert.equal(path.basename(candidate.resourceBase.path), candidate.name)
    assert.match(candidate.description, /C\+\+23/)
    assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true })
  }

  const loaded = await provider.get(candidates[0])
  assert.equal(loaded.name, 'building-cpp')
  assert.match(loaded.content, /^# /)
  await rm(root, { recursive: true, force: true })
})

test('the tag snapshot rides only on developing-cpp and follows the config', async () => {
  const root = await makeRepo({ cpp: true })
  const provider = makeProvider({ author: { enabled: true, value: 'chengzhao-dev' } })
  const candidates = await provider.list({ cwd: root })
  const developing = candidates.find((candidate) => candidate.name === 'developing-cpp')
  const building = candidates.find((candidate) => candidate.name === 'building-cpp')
  const loaded = await provider.get(developing)
  assert.match(loaded.content, /当前注释配置/)
  assert.match(loaded.content, /@author chengzhao-dev/)
  assert.doesNotMatch(building ? (await provider.get(building)).content : '', /当前注释配置/)
  await rm(root, { recursive: true, force: true })
})

test('the gate works from a deep cwd inside the checkout', async () => {
  const root = await makeRepo({ cpp: true })
  const nested = path.join(root, 'src', 'core', 'detail')
  await mkdir(nested, { recursive: true })
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: nested })).length, 3)
  await rm(root, { recursive: true, force: true })
})

test('get() rejects a candidate when the supplied cwd has no project skill', async () => {
  const cppRoot = await makeRepo({ cpp: true })
  const other = await makeRepo({ projectSkill: false })
  const provider = makeProvider()
  const [candidate] = await provider.list({ cwd: cppRoot })
  assert.ok(candidate)
  assert.equal(await provider.get(candidate, { cwd: other }), undefined)
  assert.equal(await provider.get(candidate, { cwd: path.join(other, 'src') }), undefined)
  assert.ok(await provider.get(candidate, { cwd: cppRoot }))
  await rm(cppRoot, { recursive: true, force: true })
  await rm(other, { recursive: true, force: true })
})

test('an unrelated README in the marker directory does not count', async () => {
  const root = await makeRepo({ projectSkill: false, cpp: true })
  const dir = path.join(root, '.agents', 'skills', 'cpp-workflow-project')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'README.md'), 'not a skill', 'utf8')
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('get() rejects foreign candidates and locators outside the skill root', async () => {
  const root = await makeRepo({ cpp: true })
  const provider = makeProvider()
  const [candidate] = await provider.list({ cwd: root })

  assert.equal(await provider.get({ ...candidate, provider: 'other' }), undefined)
  assert.equal(await provider.get({ ...candidate, locator: root }), undefined)
  assert.equal(await provider.get({ ...candidate, locator: path.join(root, 'skills', 'x') }), undefined)
  assert.equal(await provider.get(undefined), undefined)
  await rm(root, { recursive: true, force: true })
})

test('an aborted signal returns no candidates', async () => {
  const root = await makeRepo({ cpp: true })
  const provider = makeProvider()
  const controller = new AbortController()
  controller.abort()
  assert.deepEqual(await provider.list({ cwd: root, signal: controller.signal }), [])
  await rm(root, { recursive: true, force: true })
})

test('isCppWorkflowWorkspace is false without a cwd', async () => {
  assert.equal(await isCppWorkflowWorkspace(undefined), false)
})
