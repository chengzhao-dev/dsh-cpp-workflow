// 发现层测试：临时复制 lib/ 与最小 skills/，验证读取失败不会被当成
// 完整空目录缓存，以及 BOM、块标量与多行 description 的边界。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdtemp, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKILL = '---\nname: developing-cpp\ndescription: test skill\n---\nbody\n'

async function makePackage() {
  await mkdir(path.join(ROOT, 'temp'), { recursive: true })
  const dir = await mkdtemp(path.join(ROOT, 'temp', 'discovery-'))
  await cp(path.join(ROOT, 'lib'), path.join(dir, 'lib'), { recursive: true })
  await mkdir(path.join(dir, 'skills', 'developing-cpp'), { recursive: true })
  await writeFile(path.join(dir, 'skills', 'developing-cpp', 'SKILL.md'), SKILL, 'utf8')
  const workspace = path.join(dir, 'workspace')
  await mkdir(path.join(workspace, '.git'), { recursive: true })
  await mkdir(path.join(workspace, '.agents', 'skills', 'cpp-workflow-project'), { recursive: true })
  await writeFile(
    path.join(workspace, '.agents', 'skills', 'cpp-workflow-project', 'SKILL.md'),
    '---\nname: cpp-workflow-project\ndescription: test\n---\n',
    'utf8',
  )
  return { dir, workspace }
}

async function loadProvider(dir) {
  const module = await import(`${pathToFileURL(path.join(dir, 'lib', 'index.js')).href}?test=${Date.now()}`)
  let provider
  module.apply({ skills: { registerProvider(factory) { provider = factory() } } })
  assert.ok(provider)
  return provider
}

test('unreadable skills root is an incomplete observation', async () => {
  const { dir, workspace } = await makePackage()
  const skills = path.join(dir, 'skills')
  const backup = path.join(dir, 'skills.bak')
  try {
    const provider = await loadProvider(dir)
    await rename(skills, backup)
    assert.deepEqual(await provider.list({ cwd: workspace }), { candidates: [], complete: false })
    await rename(backup, skills)
  } finally {
    await rename(backup, skills).catch(() => {})
    await rm(dir, { recursive: true, force: true })
  }
})

test('unreadable SKILL.md is an incomplete observation', async () => {
  const { dir, workspace } = await makePackage()
  const file = path.join(dir, 'skills', 'developing-cpp', 'SKILL.md')
  const backup = path.join(dir, 'skills', 'developing-cpp', 'SKILL.md.bak')
  try {
    const provider = await loadProvider(dir)
    await rename(file, backup)
    assert.deepEqual(await provider.list({ cwd: workspace }), { candidates: [], complete: false })
    await rename(backup, file)
  } finally {
    await rename(backup, file).catch(() => {})
    await rm(dir, { recursive: true, force: true })
  }
})

test('BOM is ignored before frontmatter', async () => {
  const { dir, workspace } = await makePackage()
  try {
    const provider = await loadProvider(dir)
    await writeFile(
      path.join(dir, 'skills', 'developing-cpp', 'SKILL.md'),
      `\uFEFF${SKILL}`,
      'utf8',
    )
    const candidates = await provider.list({ cwd: workspace })
    assert.equal(candidates.length, 1)
    assert.equal(candidates[0].description, 'test skill')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('block scalars are rejected instead of becoming a literal indicator', async () => {
  const { dir, workspace } = await makePackage()
  try {
    const provider = await loadProvider(dir)
    await writeFile(
      path.join(dir, 'skills', 'developing-cpp', 'SKILL.md'),
      '---\nname: developing-cpp\ndescription: >\n  test skill\n---\nbody\n',
      'utf8',
    )
    assert.deepEqual(await provider.list({ cwd: workspace }), [])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('multiline descriptions are collapsed to one catalog line', async () => {
  const { dir, workspace } = await makePackage()
  try {
    const provider = await loadProvider(dir)
    await writeFile(
      path.join(dir, 'skills', 'developing-cpp', 'SKILL.md'),
      '---\nname: developing-cpp\ndescription: "one\\ntwo"\n---\nbody\n',
      'utf8',
    )
    const candidates = await provider.list({ cwd: workspace })
    assert.equal(candidates[0].description, 'one two')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
