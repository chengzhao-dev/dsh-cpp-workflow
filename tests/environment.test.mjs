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

const VERSIONS = {
  'clang++': 'clang version 18.1.3',
  'clang-format': 'clang-format version 18.1.3',
  'clang-tidy': 'LLVM version 18.1.3',
  clangd: 'clangd version 18.1.3',
  cmake: 'cmake version 3.29.0',
  ninja: '1.11.1',
  ctest: 'ctest version 3.29.0',
}

const GCC_VERSIONS = {
  ...VERSIONS,
  'g++': 'g++ (GCC) 14.1.0',
}

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

/** Fake PATH resolver: every listed command exists at /fake/bin/<command>. */
function resolver(command) {
  return `/fake/bin/${command}`
}

/** Fake --version runner, keyed by the resolved command's basename. */
function runner(versions) {
  return (executable) => {
    const command = path.basename(executable)
    return { status: 0, stdout: `${versions[command] ?? ''}\n`, stderr: '', signal: null }
  }
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
    assert.deepEqual(result.axes, { ...environment, standard: 'c++23' })
  }
})

test('accepts each supported language standard', () => {
  for (const standard of ['c++11', 'c++14', 'c++17', 'c++20', 'c++23']) {
    const result = validateEnvironment({
      host: 'linux',
      build_host: 'native',
      compiler: 'clang',
      standard,
    })
    assert.equal(result.ok, true, result.issues.join('; '))
    assert.equal(result.axes.standard, standard)
  }
})

test('missing or empty standard defaults to c++23 with a migration note', () => {
  for (const value of [undefined, '']) {
    const environment = { host: 'linux', build_host: 'native', compiler: 'clang', standard: value }
    const result = validateEnvironment(environment)
    assert.equal(result.ok, true, result.issues.join('; '))
    assert.equal(result.axes.standard, 'c++23')
    assert.match(result.notes.join('\n'), /standard 未声明或为空/)
  }
})

test('rejects unknown, non-string and multiple standards', () => {
  for (const standard of ['c++98', '23', 23]) {
    const result = validateEnvironment({
      host: 'linux',
      build_host: 'native',
      compiler: 'clang',
      standard,
    })
    assert.equal(result.ok, false)
    assert.match(result.issues.join('\n'), /standard/)
  }
  const array = validateEnvironment({
    host: 'linux',
    build_host: 'native',
    compiler: 'clang',
    standard: ['c++20', 'c++23'],
  })
  assert.equal(array.ok, false)
  assert.match(array.issues.join('\n'), /只能声明一个值/)
})

test('windows native is rejected statically with one plain reason', () => {
  const result = validateEnvironment({
    host: 'windows',
    build_host: 'native',
    compiler: 'clang',
  })
  assert.equal(result.ok, false)
  assert.deepEqual(result.issues, ['本版本不能在 Windows 原生壳里构建'])
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

test('notes unknown keys without rejecting the legal environment axes', () => {
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
      standard: 'c++23',
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

test('live mode stops on Windows native before touching PATH', () => {
  const result = checkLive(
    { host: 'windows', build_host: 'native', compiler: 'clang' },
    { platform: 'win32', env: {}, pathValue: '' },
  )
  assert.equal(result.ok, false)
  assert.deepEqual(result.issues, ['本版本不能在 Windows 原生壳里构建'])
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

test('live mode accepts a complete clang toolchain on the declared host', () => {
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'clang' },
    {
      platform: 'linux',
      env: {},
      pathValue: '/fake/bin',
      resolveExecutable: resolver,
      runVersion: runner(VERSIONS),
    },
  )
  assert.equal(result.ok, true, result.issues.join('; '))
  assert.equal(result.checks.length, 7)
  assert.equal(result.checks.find((check) => check.role === 'compiler')?.version, '18.1.3')
})

test('live mode accepts GCC while keeping the Clang analysis tools', () => {
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'gcc' },
    {
      platform: 'linux',
      env: {},
      pathValue: '/fake/bin',
      resolveExecutable: resolver,
      runVersion: runner(GCC_VERSIONS),
    },
  )
  assert.equal(result.ok, true, result.issues.join('; '))
})

test('live mode only requires clangd to exist in GCC mode', () => {
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'gcc' },
    {
      platform: 'linux',
      env: {},
      pathValue: '/fake/bin',
      resolveExecutable: resolver,
      runVersion: runner({ ...GCC_VERSIONS, clangd: '' }),
    },
  )
  assert.equal(result.ok, true, result.issues.join('; '))
  const clangd = result.checks.find((check) => check.role === 'clangd')
  assert.equal(clangd?.status, 'found')
  assert.equal(clangd?.version, undefined)
})

test('live mode enforces one LLVM major version in clang mode', () => {
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'clang' },
    {
      platform: 'linux',
      env: {},
      pathValue: '/fake/bin',
      resolveExecutable: resolver,
      runVersion: runner({ ...VERSIONS, 'clang-format': 'clang-format version 19.1.0' }),
    },
  )
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /主版本不一致/)
})

test('live mode rejects clang-format before 16 even when majors agree', () => {
  const old = {
    'clang++': 'clang version 15.0.7',
    'clang-format': 'clang-format version 15.0.7',
    'clang-tidy': 'LLVM version 15.0.7',
    clangd: 'clangd version 15.0.7',
    cmake: 'cmake version 3.29.0',
    ninja: '1.11.1',
    ctest: 'ctest version 3.29.0',
  }
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'clang' },
    {
      platform: 'linux',
      env: {},
      pathValue: '/fake/bin',
      resolveExecutable: resolver,
      runVersion: runner(old),
    },
  )
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /clang-format 15\.0\.7 过旧/)
  assert.match(result.issues.join('\n'), /clang-tidy 15\.0\.7 过旧/)
})

test('live mode requires cmake 3.20 or newer', () => {
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'clang' },
    {
      platform: 'linux',
      env: {},
      pathValue: '/fake/bin',
      resolveExecutable: resolver,
      runVersion: runner({ ...VERSIONS, cmake: 'cmake version 3.19.8' }),
    },
  )
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /cmake 3\.19\.8 过旧/)
})

test('live mode rejects a g++ that is really Apple clang', () => {
  const result = checkLive(
    { host: 'macos', build_host: 'native', compiler: 'gcc' },
    {
      platform: 'darwin',
      env: {},
      pathValue: '/fake/bin',
      resolveExecutable: resolver,
      runVersion: runner({ ...GCC_VERSIONS, 'g++': 'Apple clang version 15.0.0' }),
    },
  )
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /g\+\+ 实际是 Apple clang/)
})

test('live mode names every missing role instead of failing silently', () => {
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'clang' },
    {
      platform: 'linux',
      env: {},
      pathValue: '',
      resolveExecutable: () => undefined,
    },
  )
  assert.equal(result.ok, false)
  assert.equal(result.checks.every((check) => check.status === 'missing'), true)
  for (const command of ['clang++', 'clang-format', 'clang-tidy', 'clangd', 'cmake', 'ninja', 'ctest']) {
    assert.match(result.issues.join('\n'), new RegExp(command.replace('+', '\\+')))
  }
})

test('live mode rejects a Linux declaration on another platform before PATH', () => {
  const result = checkLive(
    { host: 'linux', build_host: 'native', compiler: 'clang' },
    { platform: 'win32', env: {}, pathValue: '' },
  )
  assert.equal(result.ok, false)
  assert.match(result.issues.join('\n'), /请在 Linux 上运行/)
  assert.equal(result.checks.length, 0)
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
