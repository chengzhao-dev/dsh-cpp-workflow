import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  checkLive,
  findProjectEnvironment,
  validateEnvironment,
} from '../skills/building-cpp/scripts/checking-environment.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, '..', 'skills', 'building-cpp', 'scripts', 'checking-environment.mjs')

function workspace(environment) {
  const root = mkdtempSync(path.join(tmpdir(), 'dsh-cpp-workflow-env-'))
  mkdirSync(path.join(root, '.git'))
  const skill = path.join(root, '.agents', 'skills', 'cpp-workflow-project')
  mkdirSync(skill, { recursive: true })
  writeFileSync(
    path.join(skill, 'environment.json'),
    `${JSON.stringify(environment, null, 2)}\n`,
    'utf8',
  )
  return root
}

function cli(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
}

test('accepts each legal axis combination', () => {
  for (const environment of [
    { host: 'windows', build_host: 'wsl', compiler: 'clang' },
    { host: 'windows', build_host: 'wsl', compiler: 'gcc' },
    { host: 'linux', build_host: 'native', compiler: 'clang' },
    { host: 'linux', build_host: 'native', compiler: 'gcc' },
    { host: 'macos', build_host: 'native', compiler: 'clang' },
  ]) {
    const result = validateEnvironment(environment)
    assert.equal(result.ok, true, result.issues.join('; '))
    assert.deepEqual(result.axes, environment)
  }
})

test('windows native is legal statically but tells the truth about the missing shell', () => {
  const result = validateEnvironment({
    host: 'windows',
    build_host: 'native',
    compiler: 'clang',
  })
  assert.equal(result.ok, true)
  assert.match(result.notes.join('\n'), /缺 shell/)
})

test('rejects empty, unknown and non-string axes', () => {
  const result = validateEnvironment({
    host: '',
    build_host: 'container',
    compiler: 42,
  })
  assert.equal(result.ok, false)
  assert.equal(result.issues.length, 3)
  assert.match(result.issues.join('\n'), /host 不能为空/)
  assert.match(result.issues.join('\n'), /build_host 的值 "container" 非法/)
  assert.match(result.issues.join('\n'), /compiler 必须是字符串/)
})

test('rejects array and multiple compilers', () => {
  const result = validateEnvironment({
    host: 'linux',
    build_host: 'native',
    compiler: ['clang', 'gcc'],
  })
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /只能声明一个值/)
})

test('rejects wsl when the host is not windows', () => {
  for (const host of ['linux', 'macos']) {
    const result = validateEnvironment({ host, build_host: 'wsl', compiler: 'clang' })
    assert.equal(result.ok, false)
    assert.match(result.issues.join('\n'), /只允许 host=windows/)
  }
})

test('rejects non-object declarations', () => {
  for (const value of [null, [], 'linux', 7]) {
    const result = validateEnvironment(value)
    assert.equal(result.ok, false)
    assert.equal(result.issues.length, 1)
  }
})

test('notes unknown keys without rejecting the legal three axes', () => {
  const result = validateEnvironment({
    host: 'linux',
    build_host: 'native',
    compiler: 'gcc',
    target: 'app',
  })
  assert.equal(result.ok, true)
  assert.match(result.notes.join('\n'), /忽略未知键 "target"/)
})

test('finds environment.json at the project root and from a deep directory', async () => {
  const root = workspace({ host: 'linux', build_host: 'native', compiler: 'gcc' })
  try {
    const deep = path.join(root, 'src', 'domain')
    mkdirSync(deep, { recursive: true })
    assert.equal(
      await findProjectEnvironment(root),
      path.join(root, '.agents', 'skills', 'cpp-workflow-project', 'environment.json'),
    )
    assert.equal(
      await findProjectEnvironment(deep),
      path.join(root, '.agents', 'skills', 'cpp-workflow-project', 'environment.json'),
    )
    assert.equal(
      await findProjectEnvironment(path.join(root, '.agents', 'skills', 'cpp-workflow-project')),
      path.join(root, '.agents', 'skills', 'cpp-workflow-project', 'environment.json'),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('does not walk above the git root', async () => {
  const outer = mkdtempSync(path.join(tmpdir(), 'dsh-cpp-workflow-outer-'))
  const skill = path.join(outer, '.agents', 'skills', 'cpp-workflow-project')
  mkdirSync(skill, { recursive: true })
  writeFileSync(
    path.join(skill, 'environment.json'),
    '{"host":"linux","build_host":"native","compiler":"gcc"}\n',
    'utf8',
  )
  const repo = path.join(outer, 'repo')
  mkdirSync(path.join(repo, '.git'), { recursive: true })
  try {
    assert.equal(await findProjectEnvironment(repo), undefined)
  } finally {
    rmSync(outer, { recursive: true, force: true })
  }
})

test('CLI exits 2 when no declaration exists', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'dsh-cpp-workflow-empty-'))
  try {
    const result = cli(['--project', root])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /找不到环境声明/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('CLI static mode exits 0 and emits JSON for a legal declaration', () => {
  const root = workspace({ host: 'windows', build_host: 'wsl', compiler: 'clang' })
  try {
    const result = cli(['--project', root, '--json'])
    assert.equal(result.status, 0, result.stderr)
    const payload = JSON.parse(result.stdout)
    assert.equal(payload.ok, true)
    assert.equal(payload.mode, 'static')
    assert.deepEqual(payload.environment, {
      host: 'windows',
      build_host: 'wsl',
      compiler: 'clang',
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('CLI exits 2 for an invalid combination before looking for executables', () => {
  const root = workspace({ host: 'linux', build_host: 'wsl', compiler: 'clang' })
  try {
    const result = cli(['--project', root, '--json'])
    assert.equal(result.status, 2)
    const payload = JSON.parse(result.stdout)
    assert.equal(payload.ok, false)
    assert.match(payload.issues.join('\n'), /wsl 只允许 host=windows/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('live mode reports the Windows native shell gap without touching PATH', () => {
  const result = checkLive(
    { host: 'windows', build_host: 'native', compiler: 'clang' },
    { platform: 'win32', env: {}, pathValue: '' },
  )
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /缺的是 shell/)
  assert.equal(result.checks.length, 0)
})

test('live mode refuses a WSL declaration outside Linux/WSL', () => {
  const result = checkLive(
    { host: 'windows', build_host: 'wsl', compiler: 'clang' },
    { platform: 'win32', env: {}, pathValue: '' },
  )
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /当前进程不在 WSL 内/)
})

test('CLI rejects malformed JSON as an invalid declaration', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'dsh-cpp-workflow-json-'))
  mkdirSync(path.join(root, '.git'))
  const skill = path.join(root, '.agents', 'skills', 'cpp-workflow-project')
  mkdirSync(skill, { recursive: true })
  writeFileSync(path.join(skill, 'environment.json'), '{ host: linux }\n', 'utf8')
  try {
    const result = cli(['--project', root])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /不是合法 JSON/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
