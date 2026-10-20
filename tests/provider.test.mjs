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

async function makeRepo({ git = true, projectSkill = true } = {}) {
  const root = await makeTemp()
  if (git) await mkdir(path.join(root, '.git'))
  if (projectSkill) await addProjectSkill(root)
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

test('the project skill opts in both skills with rank 550', async () => {
  const root = await makeRepo()
  const provider = makeProvider()
  const candidates = await provider.list({ cwd: root })

  assert.deepEqual(candidates.map((candidate) => candidate.name), ['building-cpp', 'developing-cpp'])
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
  assert.equal(candidates.length, 2)
  await rm(root, { recursive: true, force: true })
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
