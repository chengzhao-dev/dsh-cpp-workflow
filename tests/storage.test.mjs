// 存储守卫：插件运行时不写盘、不建缓存、不起定时器。
// 静态扫描锁住来源与构建产物里的写盘 API；运行时快照锁住「调用前后文件不变」。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from '../lib/index.js'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const SCAN_DIRS = ['src', 'lib']
const SOURCE_EXTENSIONS = /\.(?:ts|js|mjs)$/
const ALLOWED_FS = new Set(['access', 'lstat', 'readFile', 'readdir', 'stat'])
const MUTATORS =
  /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink|rename|copyFile)(?:Sync)?\s*\(/
const TIMERS = /\b(?:setInterval|setTimeout)\s*\(/
const STORAGE = /\b(?:localStorage|sessionStorage|indexedDB|caches)\b/
const FS_IMPORT = /import\s+([\s\S]+?)\s+from\s+['"]node:fs(?:\/promises)?['"]/g

async function listFiles(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(abs)))
    else if (SOURCE_EXTENSIONS.test(entry.name)) files.push(abs)
  }
  return files
}

function relative(abs) {
  return path.relative(REPO_ROOT, abs).split(path.sep).join('/')
}

test('plugin sources do not write files, create caches, or start timers', async () => {
  const files = []
  for (const dir of SCAN_DIRS) files.push(...(await listFiles(path.join(REPO_ROOT, dir))))
  assert.ok(files.length > 0, 'no source files found to scan')

  for (const file of files) {
    const text = await readFile(file, 'utf8')
    const name = relative(file)
    assert.doesNotMatch(text, MUTATORS, `${name}: filesystem mutator is not allowed`)
    assert.doesNotMatch(text, TIMERS, `${name}: timers are not allowed`)
    assert.doesNotMatch(text, STORAGE, `${name}: browser storage is not allowed`)
    assert.doesNotMatch(
      text,
      /require\s*\(\s*['"]node:fs(?:\/promises)?['"]\s*\)/,
      `${name}: CommonJS fs require is not allowed`,
    )

    for (const match of text.matchAll(FS_IMPORT)) {
      const clause = match[1].trim()
      const named = clause.match(/^\{([\s\S]*)\}$/)
      assert.ok(named, `${name}: node:fs imports must be named and read-only`)
      for (const spec of named[1].split(',')) {
        const imported = spec.trim().split(/\s+as\s+/)[0].trim()
        if (imported === '') continue
        assert.ok(ALLOWED_FS.has(imported), `${name}: node:fs ${imported} is not read-only`)
      }
    }
  }
})

async function snapshot(root) {
  const entries = []
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name)
      const rel = path.relative(root, abs).split(path.sep).join('/')
      if (entry.isDirectory()) {
        entries.push(`${rel}/`)
        await visit(abs)
      } else {
        const info = await stat(abs)
        entries.push(`${rel}\t${info.size}\t${info.mtimeMs}`)
      }
    }
  }
  await visit(root)
  return entries.sort()
}

test('repeated provider calls leave the workspace byte-identical', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-cpp-workflow-storage-'))
  try {
    await mkdir(path.join(root, '.git'))
    const project = path.join(root, '.agents', 'skills', 'cpp-workflow-project')
    await mkdir(project, { recursive: true })
    await writeFile(
      path.join(project, 'SKILL.md'),
      '---\nname: cpp-workflow-project\ndescription: storage guard\n---\n',
      'utf8',
    )
    await writeFile(
      path.join(project, 'environment.json'),
      '{"host":"linux","build_host":"native","compiler":"clang"}\n',
      'utf8',
    )

    let provider
    apply({
      skills: {
        registerProvider(factory) {
          provider = factory()
        },
      },
    })
    assert.ok(provider, 'apply() must register a provider')

    const before = await snapshot(root)
    for (let round = 0; round < 20; round += 1) {
      const candidates = await provider.list({ cwd: root })
      assert.equal(candidates.length, 3)
      for (const candidate of candidates) {
        assert.ok(await provider.get(candidate), `get(${candidate.name}) must return content`)
      }
    }
    assert.deepEqual(await snapshot(root), before)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
