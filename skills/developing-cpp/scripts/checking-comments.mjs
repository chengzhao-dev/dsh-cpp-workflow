#!/usr/bin/env node
// 只读注释审计：按 references/comments.md 的硬规则检查 C/C++ 源文件。
//
// 检查项：文件头横幅、横幅宽度、注释行宽度、Doxygen 标签、注释与声明的贴合、
// 类型注释存在性、成员功能清单、设计论证（方案对比）、@param 完整性、枚举成员注释一致性。
// 不重写任何文件。
//
// 用法：
//   node checking-comments.mjs [--root DIR] [--width N] [--banner-width N] [--no-header] [--json] [--quiet]
//
// 退出码：0 无问题，1 发现问题，2 用法或读取错误。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const EXIT = { ok: 0, issues: 1, usage: 2 }

const SOURCE_EXT = new Set([
  '.h', '.hh', '.hpp', '.hxx', '.h++', '.inl', '.ipp', '.tpp',
  '.cpp', '.cc', '.cxx', '.c++', '.c', '.m', '.mm',
])
const HEADER_EXT = new Set(['.h', '.hh', '.hpp', '.hxx', '.h++', '.inl', '.ipp', '.tpp'])
const SKIP_DIR = new Set([
  '.git', '.hg', '.svn', 'build', 'out', 'node_modules', '_book', '.quarto', '.cache',
  '.tmp', 'temp', 'third_party', 'third-party', 'external', 'vendor', 'deps', 'cmake-build-debug',
  'cmake-build-release', '.vs', '.idea',
])
const FORBIDDEN_TAGS = ['@returns', '@brief', '@details', '@author', '@since', '@todo', '@date', '@file', '@copyright', '@version']
const BANNER = /^\/\/=+-+=+\/\/$/
const MEMBER_LIST = /提供[^。]{0,40}、[^。]{0,40}(的功能|的能力|的接口)|功能[:：]/
const RATIONALE = /而不是|而非|代价.{0,4}忽略|只留一份|与其|比.{0,12}更|更(?:安全|快|清楚|直接|好写|难写)/
const FORWARD_REF = /(?:留在|归|交给|由)\s*`?[A-Z][A-Za-z0-9_]*`?/
const TYPE_SYSTEM = /值语义|自由拷贝/
const DECL_KEYWORDS = /^(class|struct|union|enum|namespace|using|typedef|template|#|if|else|for|while|switch|return|case|default)\b/

function usage(message) {
  if (message) process.stderr.write(`错误：${message}\n`)
  process.stderr.write('用法：node checking-comments.mjs [--root DIR] [--width N] [--banner-width N] [--no-header] [--json] [--quiet]\n')
  return EXIT.usage
}

function parseArgs(argv) {
  const options = { root: undefined, width: 80, bannerWidth: 80, requireHeader: true, json: false, quiet: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') {
      options.root = argv[index + 1]
      index += 1
    } else if (arg === '--width') {
      options.width = Number(argv[index + 1])
      index += 1
    } else if (arg === '--banner-width') {
      options.bannerWidth = Number(argv[index + 1])
      index += 1
    } else if (arg === '--no-header') {
      options.requireHeader = false
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
  for (const key of ['width', 'bannerWidth']) {
    if (!Number.isInteger(options[key]) || options[key] < 40) {
      throw new Error(`--${key} 需要不小于 40 的整数`)
    }
  }
  return options
}

/** 中文按两列计宽，用于判断渲染后的行宽。 */
export function displayWidth(text) {
  let width = 0
  for (const char of text) {
    const code = char.codePointAt(0)
    const wide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f64f) ||
      (code >= 0x20000 && code <= 0x3fffd)
    width += wide ? 2 : 1
  }
  return width
}

/** 取出顶层逗号分隔的参数段，忽略模板与括号内的逗号。 */
function splitParams(text) {
  const parts = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '<' || char === '(' || char === '[' || char === '{') depth += 1
    if (char === '>' || char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.trim() !== '') parts.push(current)
  return parts.map((part) => part.trim()).filter((part) => part !== '' && part !== 'void')
}

/** 取参数名：去掉默认值、数组后缀、引用与指针，保留最后一个标识符。 */
function paramName(part) {
  let text = part
  if (text.includes('=')) text = text.slice(0, text.indexOf('='))
  text = text.replace(/\[[^\]]*\]/g, ' ').trim()
  if (text === '...') return undefined
  const tokens = text.match(/[A-Za-z_]\w*/g) ?? []
  const last = tokens.at(-1)
  if (!last) return undefined
  if (['const', 'volatile', 'signed', 'unsigned', 'void'].includes(last)) return undefined
  return last
}

/** 提取函数声明的参数名列表；不是函数声明时返回 undefined。 */
export function functionParams(declaration) {
  const decl = declaration.trim().replace(/^template\s*<[^>]*>\s*/, '')
  if (DECL_KEYWORDS.test(decl)) return undefined
  const open = decl.indexOf('(')
  if (open === -1) return undefined
  const namePart = decl.slice(0, open).trim()
  if (!/[~A-Za-z_]\w*$|operator\W/.test(namePart)) return undefined
  let depth = 0
  let close = -1
  for (let index = open; index < decl.length; index += 1) {
    const char = decl[index]
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        close = index
        break
      }
    }
  }
  if (close === -1) return undefined
  const tail = decl.slice(close + 1).trim()
  if (tail !== '' && !/^[;{:]/.test(tail) && !/^(const|noexcept|override|final|->|=\s*(0|default|delete))/.test(tail)) {
    return undefined
  }
  return splitParams(decl.slice(open + 1, close)).map(paramName).filter(Boolean)
}

/** 检查一段文本，返回问题列表；每个问题带 1 起始的行号。 */
export function checkText(text, options = {}) {
  const width = options.width ?? 80
  const bannerWidth = options.bannerWidth ?? 80
  const requireHeader = options.requireHeader ?? true
  const lines = text.split(/\r?\n/)
  const issues = []
  const add = (line, rule, message) => issues.push({ line, rule, message })

  const firstContent = lines.findIndex((line) => line.trim() !== '')
  if (requireHeader && firstContent !== -1 && !BANNER.test(lines[firstContent].trim())) {
    add(firstContent + 1, 'header-missing', '文件开头缺少文件头横幅（//===...===//）')
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (BANNER.test(trimmed)) {
      const actual = displayWidth(trimmed)
      if (actual !== bannerWidth) add(index + 1, 'banner-width', `横幅宽度 ${actual} 列，应为 ${bannerWidth} 列`)
      continue
    }
    if (trimmed.startsWith('///') || (trimmed.startsWith('//') && !trimmed.startsWith('//!'))) {
      if (displayWidth(trimmed) > width) add(index + 1, 'comment-width', `注释行 ${displayWidth(trimmed)} 列，超过 ${width} 列`)
      for (const tag of FORBIDDEN_TAGS) {
        if (trimmed.includes(tag)) add(index + 1, 'forbidden-tag', `禁止使用 ${tag}，按 references/comments.md 的标签表改写`)
      }
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith('///')) continue
    if (lines[index].trim().startsWith('///<')) continue
    const start = index
    let end = index
    while (end + 1 < lines.length && lines[end + 1].trim().startsWith('///') && !lines[end + 1].trim().startsWith('///<')) {
      end += 1
    }
    index = end
    let next = end + 1
    if (next < lines.length && lines[next].trim() === '') {
      add(end + 1, 'doc-gap', '注释与声明之间有空行：注释会挂到下一个声明，请删掉空行')
      while (next < lines.length && lines[next].trim() === '') next += 1
    }
    if (next >= lines.length) continue
    const declaration = lines[next].trim()
    const block = lines.slice(start, end + 1).join('\n')
    const isType = /^(template\s*<[^>]*>\s*)?(class|struct|union|enum)\b/.test(declaration)
    if (RATIONALE.test(block)) {
      add(start + 1, 'rationale', '注释在写设计取舍：方案对比与理由移到正文或实现注释，接口注释只留契约')
    }
    if (isType && MEMBER_LIST.test(block)) {
      add(start + 1, 'member-list', '类型注释在罗列成员功能，应改写为概念与使用约定')
    }
    if (isType && FORWARD_REF.test(block)) {
      add(start + 1, 'forward-ref', '类型注释在交代别的类型负责什么：只写本类型的契约，跨文件边界留给文件头')
    }
    if (isType && TYPE_SYSTEM.test(block)) {
      add(start + 1, 'type-system', '类型注释在复述类型系统已表达的性质：可拷贝与 const 查询由声明给出，删掉这句')
    }
    const params = functionParams(declaration)
    if (!params) continue
    const documented = [...block.matchAll(/@param(?:\[[^\]]*\])?\s+(\w+)/g)].map((match) => match[1])
    if (documented.length === 0) continue
    for (const name of params) {
      if (!documented.includes(name)) add(start + 1, 'param-missing', `参数 ${name} 没有 @param 说明`)
    }
    for (const name of documented) {
      if (!params.includes(name)) add(start + 1, 'param-extra', `@param ${name} 在声明里不存在`)
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (!/^(template\s*<[^>]*>\s*)?enum\b/.test(trimmed)) continue
    let body = index
    while (body < lines.length && !lines[body].includes('{')) body += 1
    if (body >= lines.length) continue
    let commented = 0
    let bare = 0
    for (let cursor = body + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor].trim()
      if (line.startsWith('}')) break
      if (line === '' || line.startsWith('//') || line.startsWith('#')) continue
      const code = line.replace(/\/\/.*$/, '').trim()
      if (/^[A-Za-z_]\w*\s*(=[^,]+)?,?$/.test(code)) {
        if (line.includes('///<')) commented += 1
        else bare += 1
      }
    }
    if (commented > 0 && bare > 0) {
      add(index + 1, 'enum-partial', '枚举成员注释需全写或全不写，当前只有部分成员有 ///<')
    }
    index = body
  }

  return issues.sort((left, right) => left.line - right.line)
}

/** 递归收集源文件，跳过生成目录与隐藏目录。 */
export function collectFiles(root) {
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIR.has(entry.name.toLowerCase()) || entry.name.startsWith('.')) continue
        walk(full)
        continue
      }
      if (entry.isFile() && SOURCE_EXT.has(path.extname(entry.name).toLowerCase())) files.push(full)
    }
  }
  if (statSync(root).isFile()) return [root]
  walk(root)
  return files.sort()
}

function main(argv) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    return usage(error.message)
  }
  if (options.help) return usage()
  const root = options.root ? path.resolve(options.root) : process.cwd()
  let files
  try {
    files = collectFiles(root)
  } catch (error) {
    return usage(`读取 ${root} 失败：${error.message}`)
  }
  const results = []
  for (const file of files) {
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch (error) {
      process.stderr.write(`错误：读取 ${file} 失败：${error.message}\n`)
      return EXIT.usage
    }
    for (const issue of checkText(text, options)) results.push({ file: path.relative(root, file) || file, ...issue })
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ root, files: files.length, issues: results }, null, 2)}\n`)
  } else if (results.length > 0) {
    for (const issue of results) process.stdout.write(`${issue.file}:${issue.line}: [${issue.rule}] ${issue.message}\n`)
    const touched = new Set(results.map((issue) => issue.file)).size
    process.stdout.write(`发现 ${results.length} 处注释问题，涉及 ${touched} 个文件。\n`)
  } else if (!options.quiet) {
    process.stdout.write(`注释检查通过：${files.length} 个文件。\n`)
  }
  return results.length === 0 ? EXIT.ok : EXIT.issues
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2))
}

export { HEADER_EXT }
