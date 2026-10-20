// Provider tests: workspace gate, candidate shape and get() confinement.
// The plugin does not need a C++ toolchain for these tests; the gate is a file
// marker and the skills are packaged Markdown.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from '../lib/index.js'

function makeProvider() {
  let provider
  apply({
    skills: {
      registerProvider(factory) {
        provider = factory()
      },
    },
  })
  assert.ok(provider, 'apply() must register a provider')
  return provider
}

async function makeTemp() {
  return mkdtemp(path.join(tmpdir(), 'dsh-cpp-workflow-'))
}

const PROJECT_SKILL = ['.agents', 'skills', 'cpp-workflow-project', 'SKILL.md']

async function addProjectSkill(root, content = '---\nname: cpp-workflow-project\ndescription: test project\n---\n') {
  const file = path.join(root, ...PROJECT_SKILL)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, content, 'utf8')
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
})

test('a non-git directory is not a workspace even with the project skill', async () => {
  const root = await makeRepo({ git: false })
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('a git checkout without the project skill is not a workspace', async () => {
  const root = await makeRepo({ projectSkill: false })
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('CMake plus C++ source opts in without a project skill', async () => {
  const root = await makeRepo({ projectSkill: false, cpp: true })
  const provider = makeProvider()
  const candidates = await provider.list({ cwd: root })
  assert.deepEqual(candidates.map((candidate) => candidate.name), ['building-cpp', 'developing-cpp', 'python-cpp-interop', 'teaching-cpp'])
  await rm(root, { recursive: true, force: true })
})

test('CMake alone or C++ source alone is not a C++ project', async () => {
  const cmakeOnly = await makeRepo({ projectSkill: false })
  await writeFile(path.join(cmakeOnly, 'CMakeLists.txt'), 'project(demo LANGUAGES CXX)\n', 'utf8')
  const sourceOnly = await makeRepo({ projectSkill: false })
  await writeFile(path.join(sourceOnly, 'main.cpp'), 'int main() { return 0; }\n', 'utf8')
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: cmakeOnly }), [])
  assert.deepEqual(await provider.list({ cwd: sourceOnly }), [])
  await rm(cmakeOnly, { recursive: true, force: true })
  await rm(sourceOnly, { recursive: true, force: true })
})

test('C++ evidence in a nested subproject counts', async () => {
  const root = await makeRepo({ projectSkill: false })
  const nested = path.join(root, 'games', 'ttt')
  await mkdir(nested, { recursive: true })
  await addCppProject(nested)
  const provider = makeProvider()
  assert.equal((await provider.list({ cwd: root })).length, 4)
  await rm(root, { recursive: true, force: true })
})

test('generated build output is not C++ evidence', async () => {
  const root = await makeRepo({ projectSkill: false })
  await writeFile(path.join(root, 'CMakeLists.txt'), 'project(demo LANGUAGES CXX)\n', 'utf8')
  await mkdir(path.join(root, 'build'), { recursive: true })
  await writeFile(path.join(root, 'build', 'main.cpp'), 'int main() { return 0; }\n', 'utf8')
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('example-only C++ sources do not opt a documentation repository in', async () => {
  const root = await makeRepo({ projectSkill: false })
  await writeFile(path.join(root, 'CMakeLists.txt'), 'project(demo LANGUAGES CXX)\n', 'utf8')
  await mkdir(path.join(root, 'examples'), { recursive: true })
  await writeFile(path.join(root, 'examples', 'main.cpp'), 'int main() { return 0; }\n', 'utf8')
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('C++ evidence above the git root does not opt in', async () => {
  const parent = await makeTemp()
  await addCppProject(parent)
  const root = path.join(parent, 'repo')
  await mkdir(root)
  await mkdir(path.join(root, '.git'))
  await writeFile(path.join(root, 'notes.md'), '# notes\n', 'utf8')
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(parent, { recursive: true, force: true })
})

test('a project skill above the git root does not opt in', async () => {
  const parent = await makeTemp()
  await addProjectSkill(parent)
  const root = path.join(parent, 'repo')
  await mkdir(root)
  await mkdir(path.join(root, '.git'))
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(parent, { recursive: true, force: true })
})

test('the project skill opts in all four skills with rank 550', async () => {
  const root = await makeRepo()
  const provider = makeProvider()
  const candidates = await provider.list({ cwd: root })

  assert.deepEqual(candidates.map((candidate) => candidate.name), ['building-cpp', 'developing-cpp', 'python-cpp-interop', 'teaching-cpp'])
  for (const candidate of candidates) {
    assert.equal(candidate.rank, 550)
    assert.equal(candidate.provider, 'dsh-cpp-workflow')
    assert.equal(candidate.source, 'bundled')
    assert.equal(candidate.resourceBase.kind, 'directory')
    assert.equal(path.basename(candidate.resourceBase.path), candidate.name)
    assert.match(candidate.description, /C\+\+20/)
    assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true })
  }

  const loaded = await provider.get(candidates[0])
  assert.equal(loaded.name, 'building-cpp')
  assert.match(loaded.content, /^# /)
  await rm(root, { recursive: true, force: true })
})

test('the gate works from a deep cwd inside the checkout', async () => {
  const root = await makeRepo()
  const nested = path.join(root, 'src', 'core')
  await mkdir(nested, { recursive: true })
  const provider = makeProvider()
  const candidates = await provider.list({ cwd: nested })
  assert.equal(candidates.length, 4)
  await rm(root, { recursive: true, force: true })
})

test('get() rejects a candidate when the supplied cwd is not a C++ workspace', async () => {
  const cppRoot = await makeRepo({ projectSkill: false, cpp: true })
  const other = await makeRepo({ projectSkill: false })
  const provider = makeProvider()
  const [candidate] = await provider.list({ cwd: cppRoot })
  assert.ok(candidate)
  assert.equal(await provider.get(candidate, { cwd: other }), undefined)
  assert.ok(await provider.get(candidate, { cwd: cppRoot }))
  await rm(cppRoot, { recursive: true, force: true })
  await rm(other, { recursive: true, force: true })
})

test('an unrelated file with the same directory name does not count', async () => {
  const root = await makeRepo({ projectSkill: false })
  const dir = path.join(root, '.agents', 'skills', 'cpp-workflow-project')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'README.md'), 'not a skill', 'utf8')
  const provider = makeProvider()
  assert.deepEqual(await provider.list({ cwd: root }), [])
  await rm(root, { recursive: true, force: true })
})

test('get() rejects foreign candidates and locators outside the skill root', async () => {
  const root = await makeRepo()
  const provider = makeProvider()
  const [candidate] = await provider.list({ cwd: root })

  assert.equal(await provider.get({ ...candidate, provider: 'other' }), undefined)
  assert.equal(await provider.get({ ...candidate, locator: root }), undefined)
  assert.equal(await provider.get({ ...candidate, locator: path.join(root, 'skills', 'x') }), undefined)
  assert.equal(await provider.get(undefined), undefined)
  await rm(root, { recursive: true, force: true })
})

test('an aborted signal returns no candidates', async () => {
  const root = await makeRepo()
  const provider = makeProvider()
  const controller = new AbortController()
  controller.abort()
  assert.deepEqual(await provider.list({ cwd: root, signal: controller.signal }), [])
  await rm(root, { recursive: true, force: true })
})
