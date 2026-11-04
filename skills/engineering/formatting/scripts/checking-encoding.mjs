#!/usr/bin/env node
// Read-only encoding audit for a Git work tree.
//
// Default profile "portable" is the cross-platform baseline: UTF-8 without BOM,
// LF line endings, one final newline. Profile "msvc" allows a UTF-8 BOM and CRLF
// only for MSVC-compiled C/C++ sources; Markdown, CMake, scripts and configs stay
// portable. It never rewrites files.
//
// Usage:
//   node checking-encoding.mjs [--root DIR] [--profile portable|msvc] [--json] [--quiet]
//
// Exit codes: 0 clean, 1 issues found, 2 usage or Git error.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const EXIT = { ok: 0, issues: 1, usage: 2 }

const UTF8_BOM = [0xef, 0xbb, 0xbf]
const UTF16_LE = [0xff, 0xfe]
const UTF16_BE = [0xfe, 0xff]
const UTF32_LE = [0xff, 0xfe, 0x00, 0x00]
const UTF32_BE = [0x00, 0x00, 0xfe, 0xff]

const CRLF_REQUIRED = new Set(['.bat', '.cmd'])
const MSVC_SOURCE = new Set([
  '.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx', '.inl', '.ixx', '.cppm', '.rc',
])
const ALWAYS_LF = new Set([
  '.md', '.qmd', '.txt', '.rst', '.yml', '.yaml', '.json', '.jsonc', '.json5', '.toml',
  '.ini', '.cfg', '.conf', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.py', '.mjs', '.cjs',
  '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.sass', '.less', '.html', '.htm', '.xml',
  '.svg', '.cmake', '.lua', '.sql', '.gitignore', '.gitattributes', '.editorconfig',
])
const NO_EXTENSION_LF = new Set(['CMakeLists.txt', 'Makefile', 'Justfile', 'Dockerfile', 'LICENSE'])

function usage(message) {
  if (message) process.stderr.write(`错误：${message}\n`)
  process.stderr.write('用法：node checking-encoding.mjs [--root DIR] [--profile portable|msvc] [--json] [--quiet]\n')
  return EXIT.usage
}

function parseArgs(argv) {
  const options = { root: undefined, profile: 'portable', json: false, quiet: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') {
      options.root = argv[index + 1]
      index += 1
    } else if (arg === '--profile') {
      options.profile = argv[index + 1]
      index += 1
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--quiet') {
      options.quiet = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`未知参数 ${arg}`)
    }
  }
  if (options.profile !== 'portable' && options.profile !== 'msvc') {
    throw new Error(`--profile 只能是 portable 或 msvc，收到 ${options.profile}`)
  }
  return options
}

function gitRoot(from) {
  try {
    return execFileSync('git', ['-C', from, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return undefined
  }
}

function listFiles(root) {
  const output = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return output
    .split('\0')
    .filter(Boolean)
    .map((item) => path.join(root, item))
    .filter((file) => {
      try {
        return statSync(file).isFile()
      } catch {
        return false
      }
    })
}

function startsWith(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte)
}

function bomOf(buffer) {
  if (startsWith(buffer, UTF32_LE)) return 'UTF-32 LE'
  if (startsWith(buffer, UTF32_BE)) return 'UTF-32 BE'
  if (startsWith(buffer, UTF8_BOM)) return 'UTF-8'
  if (startsWith(buffer, UTF16_LE)) return 'UTF-16 LE'
  if (startsWith(buffer, UTF16_BE)) return 'UTF-16 BE'
  return undefined
}

function isBinary(buffer) {
  const limit = Math.min(buffer.length, 8192)
  for (let index = 0; index < limit; index += 1) {
    if (buffer[index] === 0) return true
  }
  return false
}

function inspect(file, root, profile) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  const extension = path.extname(file).toLowerCase()
  const source = MSVC_SOURCE.has(extension)
  const alwaysLf = ALWAYS_LF.has(extension) || NO_EXTENSION_LF.has(path.basename(file))
  const issues = []
  const add = (kind, message) => issues.push({ path: rel, kind, message })

  let buffer
  try {
    buffer = readFileSync(file)
  } catch (error) {
    add('read', `无法读取（${error.message}）`)
    return { rel, issues }
  }

  const bom = bomOf(buffer)
  if (bom === 'UTF-8') {
    if (profile !== 'msvc' || !source) {
      add('bom', profile === 'msvc' && !source ? '只有 MSVC 编译的 C/C++ 源码可以带 BOM' : '不应带 BOM')
    }
  } else if (bom) {
    add('bom', `发现 ${bom} BOM；只接受 UTF-8`)
  }

  if (bom && bom !== 'UTF-8') {
    return { rel, issues }
  }
  if (isBinary(buffer)) {
    return { rel, issues }
  }

  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    add('utf8', '不是合法 UTF-8')
    return { rel, issues }
  }

  const body = text.startsWith('\uFEFF') ? text.slice(1) : text
  if (body.includes('\uFEFF')) {
    add('bom', '文件中间含 U+FEFF')
  }

  if (buffer.length > 0 && !body.endsWith('\n')) {
    add('newline', '缺少末尾换行')
  }

  const crlf = (body.match(/\r\n/g) ?? []).length
  const lf = (body.match(/(?<!\r)\n/g) ?? []).length
  const cr = (body.match(/\r(?!\n)/g) ?? []).length

  if (CRLF_REQUIRED.has(extension)) {
    if (crlf === 0 || lf > 0 || cr > 0) add('eol', '应为 CRLF')
  } else if (profile === 'msvc' && source && !alwaysLf) {
    if ((crlf > 0 && lf > 0) || cr > 0) add('eol', '不要混用 CRLF 与 LF')
  } else if (crlf > 0 || cr > 0) {
    add('eol', '应为 LF')
  }

  return { rel, issues }
}

export function checkEncoding(root, profile = 'portable') {
  const files = listFiles(root)
  const results = []
  for (const file of files) {
    results.push(inspect(file, root, profile))
  }
  const issues = results.flatMap((result) => result.issues)
  const counts = { files: results.length, issues: issues.length, bom: 0, eol: 0, utf8: 0, newline: 0, read: 0 }
  for (const issue of issues) counts[issue.kind] = (counts[issue.kind] ?? 0) + 1
  return { root, profile, files: results.length, issues, counts }
}

function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    return usage(error.message)
  }
  if (options.help) {
    process.stdout.write('检查 Git 工作树的 UTF-8/BOM、行尾与末尾换行；默认 portable。\n')
    return EXIT.ok
  }

  const base = options.root ? path.resolve(options.root) : process.cwd()
  if (!existsSync(base)) return usage(`根目录不存在：${base}`)
  const root = gitRoot(base)
  if (!root) return usage(`不是 Git 工作树：${base}`)

  let report
  try {
    report = checkEncoding(root, options.profile)
  } catch (error) {
    process.stderr.write(`错误：${error.message}\n`)
    return EXIT.usage
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } else if (!options.quiet || report.issues.length > 0) {
    if (report.issues.length === 0) {
      process.stdout.write(`编码检查：${report.files} 个文件，未发现问题（profile ${report.profile}）。\n`)
    } else {
      process.stdout.write(`编码检查：${report.files} 个文件，发现 ${report.issues.length} 个问题（profile ${report.profile}）。\n`)
      for (const issue of report.issues) {
        process.stdout.write(`  ${issue.path}: [${issue.kind}] ${issue.message}\n`)
      }
      process.stdout.write(
        `汇总：BOM ${report.counts.bom}，行尾 ${report.counts.eol}，UTF-8 ${report.counts.utf8}，末尾换行 ${report.counts.newline}\n`,
      )
    }
  }
  return report.issues.length === 0 ? EXIT.ok : EXIT.issues
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main()
}
