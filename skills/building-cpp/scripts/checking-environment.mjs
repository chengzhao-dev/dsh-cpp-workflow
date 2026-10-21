#!/usr/bin/env node
// Read-only environment checker for the cpp-workflow project skill.
//
// Static mode validates `.agents/skills/cpp-workflow-project/environment.json`
// without touching PATH. `--live` additionally verifies the current build host,
// the declared tool roles and version compatibility.
//
// It never installs, downloads, edits PATH or writes into the project.
import { accessSync, constants, existsSync, readFileSync } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const HOSTS = ['windows', 'linux', 'macos']
export const BUILD_HOSTS = ['native', 'wsl']
export const COMPILERS = ['clang', 'gcc']
const PROJECT_SKILL_DIR = path.join('.agents', 'skills', 'cpp-workflow-project')
const MAX_ASCENT = 64

export const EXIT = {
  ok: 0,
  script: 1,
  declaration: 2,
  live: 3,
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalize(value) {
  return typeof value === 'string' ? value.trim() : value
}

/**
 * Validate the three axes and their combination. Pure: no filesystem or PATH.
 * @returns {{ok: boolean, issues: string[], notes: string[], axes: {host?: string, build_host?: string, compiler?: string}}}
 */
export function validateEnvironment(value) {
  const issues = []
  const notes = []
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: ['environment.json 必须是一个 JSON 对象'],
      notes,
      axes: {},
    }
  }

  const axes = {
    host: normalize(value.host),
    build_host: normalize(value.build_host),
    compiler: normalize(value.compiler),
  }

  for (const [key, allowed] of [
    ['host', HOSTS],
    ['build_host', BUILD_HOSTS],
    ['compiler', COMPILERS],
  ]) {
    const current = axes[key]
    if (current === undefined || current === null || current === '') {
      issues.push(`${key} 不能为空；请显式声明，例如 ${allowed[0]}`)
      continue
    }
    if (Array.isArray(current)) {
      issues.push(`${key} 只能声明一个值，当前是数组 [${current.join(', ')}]`)
      continue
    }
    if (typeof current !== 'string') {
      issues.push(`${key} 必须是字符串，当前是 ${typeof current}`)
      continue
    }
    if (!allowed.includes(current)) {
      issues.push(`${key} 的值 "${current}" 非法；允许：${allowed.join(' / ')}`)
    }
  }

  if (axes.host === 'linux' || axes.host === 'macos') {
    if (axes.build_host === 'wsl') {
      issues.push('build_host=wsl 只允许 host=windows；Linux/macOS 请用 build_host=native')
    }
  }

  if (axes.host === 'windows' && axes.build_host === 'native') {
    notes.push('windows + native 是合法声明，但本版本没有 PowerShell 构建脚本；--live 会报告缺 POSIX 壳，而不是缺编译器')
  }

  for (const key of Object.keys(value)) {
    if (!['host', 'build_host', 'compiler'].includes(key)) {
      notes.push(`忽略未知键 "${key}"；环境只认 host / build_host / compiler`)
    }
  }

  return { ok: issues.length === 0, issues, notes, axes }
}

/** Read and parse environment.json, returning a declaration or a structured error. */
export async function readEnvironmentFile(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch {
    return { ok: false, file, issues: [`找不到环境声明：${file}`] }
  }
  let value
  try {
    value = JSON.parse(text)
  } catch (error) {
    return { ok: false, file, issues: [`environment.json 不是合法 JSON：${error.message}`] }
  }
  return { ok: true, file, value }
}

/** Walk from startDir to the git root (or filesystem root) for environment.json. */
export async function findProjectEnvironment(startDir) {
  let cursor
  try {
    cursor = path.resolve(startDir)
  } catch {
    return undefined
  }

  // Allow pointing directly at the project skill directory.
  if (path.basename(cursor) === 'cpp-workflow-project') {
    const direct = path.join(cursor, 'environment.json')
    if (await exists(direct)) return direct
  }

  for (let depth = 0; depth < MAX_ASCENT; depth += 1) {
    const candidate = path.join(cursor, PROJECT_SKILL_DIR, 'environment.json')
    if (await exists(candidate)) return candidate
    if (await exists(path.join(cursor, '.git'))) return undefined
    const parent = path.dirname(cursor)
    if (parent === cursor) return undefined
    cursor = parent
  }
  return undefined
}

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

function findExecutable(command, pathValue = process.env.PATH ?? '') {
  if (!command || command.includes(path.sep) || command.includes('/')) {
    return existsSync(command) ? command : undefined
  }
  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) continue
    const candidate = path.join(dir, command)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // keep looking
    }
  }
  return undefined
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeout ?? 15000,
    cwd: options.cwd,
    env: options.env ?? process.env,
  })
  return {
    status: typeof result.status === 'number' ? result.status : -1,
    signal: result.signal ?? null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  }
}

function firstLines(text, count = 3) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, count)
    .join(' | ')
}

function parseVersion(text) {
  const apple = /Apple clang version\s+(\d+)\.(\d+)(?:\.(\d+))?/i.exec(text)
  if (apple) {
    return { apple: true, major: Number(apple[1]), minor: Number(apple[2]), patch: Number(apple[3] ?? 0) }
  }
  const clang = /\bclang(?:d|-format|-tidy)? version\s+(\d+)\.(\d+)(?:\.(\d+))?/i.exec(text)
  if (clang) {
    return { apple: false, major: Number(clang[1]), minor: Number(clang[2]), patch: Number(clang[3] ?? 0) }
  }
  const llvm = /LLVM version\s+(\d+)\.(\d+)(?:\.(\d+))?/i.exec(text)
  if (llvm) {
    return { apple: false, major: Number(llvm[1]), minor: Number(llvm[2]), patch: Number(llvm[3] ?? 0) }
  }
  const gcc = /\b(\d+)\.(\d+)\.(\d+)\b/.exec(text)
  if (gcc) {
    return { apple: false, major: Number(gcc[1]), minor: Number(gcc[2]), patch: Number(gcc[3]) }
  }
  return undefined
}

function versionText(version) {
  if (!version) return '未知'
  return `${version.major}.${version.minor}.${version.patch}${version.apple ? ' (Apple clang)' : ''}`
}

function isWsl(env = process.env) {
  if (env.WSL_DISTRO_NAME || env.WSL_INTEROP) return true
  try {
    return /microsoft/i.test(readFileSync('/proc/version', 'utf8'))
  } catch {
    return false
  }
}

/**
 * Live check. Dependencies are injectable so tests can exercise the host and
 * PATH branches without invoking a compiler.
 */
export function checkLive(declaration, options = {}) {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const pathValue = options.pathValue ?? env.PATH ?? ''
  const resolveExecutable = options.resolveExecutable ?? findExecutable
  const runVersion = options.runVersion ?? ((command) => run(command, ['--version']))
  const issues = []
  const notes = []
  const checks = []

  const validation = validateEnvironment(declaration)
  if (!validation.ok) {
    return { ok: false, issues: validation.issues, notes: validation.notes, checks }
  }
  const { host, build_host: buildHost, compiler } = validation.axes

  if (host === 'windows' && buildHost === 'native') {
    return {
      ok: false,
      issues: [
        'Windows 原生构建缺少 POSIX 壳；本版本没有 PowerShell 构建脚本。缺的是壳，不是编译器。请改用 WSL 并把 build_host 改成 wsl，或补一个 PowerShell 版本。',
      ],
      notes: validation.notes,
      checks,
    }
  }

  if (buildHost === 'wsl') {
    if (platform !== 'linux' || !isWsl(env)) {
      issues.push('声明 build_host=wsl，但当前进程不在 WSL 内；请在 WSL 里运行 --live')
    }
  } else if (host === 'windows') {
    if (platform !== 'win32') {
      issues.push(`声明 host=windows + build_host=native，但当前平台是 ${platform}；请在 Windows 上运行 --live`)
    }
  } else if (host === 'linux' && platform !== 'linux') {
    issues.push(`声明 host=linux，但当前平台是 ${platform}；请在 Linux 上运行 --live`)
  } else if (host === 'macos' && platform !== 'darwin') {
    issues.push(`声明 host=macos，但当前平台是 ${platform}；请在 macOS 上运行 --live`)
  }

  if (issues.length > 0) {
    return { ok: false, issues, notes: validation.notes.concat(notes), checks }
  }

  const compilerCommand = compiler === 'clang' ? 'clang++' : 'g++'
  const roles = [
    { role: 'compiler', command: compilerCommand },
    { role: 'clang-format', command: 'clang-format' },
    { role: 'clang-tidy', command: 'clang-tidy' },
    { role: 'clangd', command: 'clangd' },
    { role: 'cmake', command: 'cmake' },
    { role: 'ninja', command: 'ninja' },
    { role: 'ctest', command: 'ctest' },
  ]

  const resolved = new Map()
  for (const item of roles) {
    const executable = resolveExecutable(item.command, pathValue)
    if (!executable) {
      issues.push(`${item.role}: PATH 中找不到 ${item.command}`)
      checks.push({ role: item.role, command: item.command, status: 'missing' })
      continue
    }
    resolved.set(item.role, executable)
    checks.push({ role: item.role, command: item.command, executable, status: 'found' })
  }

  if (issues.length > 0) {
    return { ok: false, issues, notes: validation.notes.concat(notes), checks }
  }

  const versions = new Map()
  for (const item of roles) {
    if (item.role === 'ninja' || item.role === 'ctest') continue
    if (compiler === 'gcc' && item.role === 'clangd') continue
    const executable = resolved.get(item.role)
    const result = runVersion(executable, ['--version'])
    const text = `${result.stdout}\n${result.stderr}`
    const version = parseVersion(text)
    versions.set(item.role, version)
    const check = checks.find((entry) => entry.role === item.role)
    if (check) {
      check.version = versionText(version)
      check.status = version ? 'found' : 'unknown-version'
    }
    if (!version) {
      issues.push(`${item.role}: 无法解析版本；输出：${firstLines(text) || '(空)'}`)
    }
  }

  const cmakeVersion = versions.get('cmake')
  if (cmakeVersion && (cmakeVersion.major < 3 || (cmakeVersion.major === 3 && cmakeVersion.minor < 20))) {
    issues.push(`cmake ${versionText(cmakeVersion)} 过旧；需要 >= 3.20`)
  }

  const compilerVersion = versions.get('compiler')
  const formatVersion = versions.get('clang-format')
  const tidyVersion = versions.get('clang-tidy')
  const clangdVersion = versions.get('clangd')

  if (compiler === 'gcc' && compilerVersion?.apple === true) {
    issues.push('声明 compiler=gcc，但 g++ 实际是 Apple clang；请安装真正的 GCC，或把 compiler 改成 clang')
  }

  if (compiler === 'clang' && compilerVersion) {
    for (const [role, version] of [
      ['clang-format', formatVersion],
      ['clang-tidy', tidyVersion],
      ['clangd', clangdVersion],
    ]) {
      if (version && version.major !== compilerVersion.major) {
        issues.push(
          `${role} ${versionText(version)} 与 clang++ ${versionText(compilerVersion)} 主版本不一致；clang 模式要求同一 LLVM 主版本`,
        )
      }
    }
    if (compilerVersion.apple) {
      notes.push(
        'clang++ 是 Apple Clang；clangd 需能经 xcrun 找到 SDK。不要混用 Homebrew LLVM 与 Xcode 资源目录，也不要把 Homebrew 路径写死。',
      )
    }
  }

  for (const [role, version] of [
    ['clang-format', formatVersion],
    ['clang-tidy', tidyVersion],
  ]) {
    if (version && version.major < 16) {
      issues.push(`${role} ${versionText(version)} 过旧；需要 >= 16（配置使用 BreakAfterAttributes）`)
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    notes: validation.notes.concat(notes),
    checks,
    environment: validation.axes,
  }
}

function parseArgs(argv) {
  const options = { project: process.cwd(), live: false, json: false, help: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--live') {
      options.live = true
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--project') {
      const value = argv[index + 1]
      if (!value) throw new Error('--project 需要一个目录')
      options.project = value
      index += 1
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length)
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }
  return options
}

const USAGE = `用法: node checking-environment.mjs [--project <dir>] [--live] [--json]

默认读取 <dir>/.agents/skills/cpp-workflow-project/environment.json，
并向上走到 git 根（最多 64 层）。

  --live   校验当前 build host、PATH 角色与版本
  --json   输出机器可读结果
  --help   显示本帮助`

async function main(argv) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${USAGE}\n`)
    return EXIT.script
  }
  if (options.help) {
    process.stdout.write(`${USAGE}\n`)
    return EXIT.ok
  }

  const start = path.resolve(options.project)
  const file = await findProjectEnvironment(start)
  if (!file) {
    process.stderr.write(
      `找不到环境声明：${path.join(start, PROJECT_SKILL_DIR, 'environment.json')}（或它的任一上层目录）\n`,
    )
    return EXIT.declaration
  }

  const read = await readEnvironmentFile(file)
  if (!read.ok) {
    process.stderr.write(`${read.issues.join('\n')}\n`)
    return EXIT.declaration
  }

  const validation = validateEnvironment(read.value)
  if (!validation.ok) {
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, mode: 'static', file, issues: validation.issues, notes: validation.notes }, null, 2)}\n`,
      )
    } else {
      process.stderr.write(`环境声明无效：${file}\n${validation.issues.map((issue) => `- ${issue}`).join('\n')}\n`)
    }
    return EXIT.declaration
  }

  if (!options.live) {
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify({ ok: true, mode: 'static', file, environment: validation.axes, notes: validation.notes }, null, 2)}\n`,
      )
    } else {
      process.stdout.write(
        `环境声明合法：${file}\nhost=${validation.axes.host} build_host=${validation.axes.build_host} compiler=${validation.axes.compiler}\n`,
      )
      for (const note of validation.notes) process.stdout.write(`提示：${note}\n`)
    }
    return EXIT.ok
  }

  const live = checkLive(read.value, { platform: process.platform, env: process.env })
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({ mode: 'live', file, ...live }, null, 2)}\n`,
    )
  } else {
    process.stdout.write(
      `环境活动校验：${file}\nhost=${validation.axes.host} build_host=${validation.axes.build_host} compiler=${validation.axes.compiler}\n`,
    )
    for (const check of live.checks) {
      const detail = check.version ?? check.detail ?? check.executable ?? ''
      process.stdout.write(`[${check.status}] ${check.role}${detail ? `: ${detail}` : ''}\n`)
    }
    for (const note of live.notes) process.stdout.write(`提示：${note}\n`)
    if (!live.ok) {
      process.stderr.write(`${live.issues.map((issue) => `- ${issue}`).join('\n')}\n`)
    }
  }

  return live.ok ? EXIT.ok : EXIT.live
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectRun) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      process.stderr.write(`检查器内部错误：${error.stack ?? error.message}\n`)
      process.exitCode = EXIT.script
    })
}

export { main }
