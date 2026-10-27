#!/usr/bin/env node
// 只读注释审计：按 references/comments.md 的硬规则检查 C/C++ 源文件。
//
// 检查项：文件头横幅、横幅宽度、注释行宽度、Doxygen 标签、注释与声明的贴合、
// 类型注释存在性、成员功能清单、设计论证（方案对比）、否定式边界、领域尺寸、谓词首句、@param 完整性、枚举成员注释一致性、数据成员主注释位置。
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
  '.git', '.hg', '.svn', 'build', 'build-release', 'out', 'node_modules', '_book', '.quarto', '.cache',
  '.tmp', 'temp', 'third_party', 'third-party', 'external', 'vendor', 'deps', 'cmake-build-debug',
  'cmake-build-release', '.vs', '.idea',
])
const FORBIDDEN_TAGS = ['@returns', '@details', '@author', '@since', '@todo', '@date', '@copyright', '@version']
const BANNER = /^\/\/=+-+=+\/\/$/
const DOXY_FILE = /^\/\/\/\s*@file\s+\S/
const DOXY_BRIEF = /^\/\/\/\s*@brief\s+\S/
const MEMBER_LIST = /提供[^。]{0,40}、[^。]{0,40}(的功能|的能力|的接口)|功能[:：]/
const RATIONALE = /而不是|而非|代价.{0,4}忽略|只留一份|与其|比.{0,12}更|更(?:安全|快|清楚|直接|好写|难写)/
const FORWARD_REF = /(?:留在|归|交给|由)\s*`?[A-Z][A-Za-z0-9_]*`?/
const TYPE_SYSTEM = /值语义|自由拷贝/
const NEGATED_BOUNDARY = /只保存|不拥有|不含/
const DOMAIN_SIZE = /\d+\s*[×xX]\s*\d+|九格|九个格子/
const PREDICATE_DECL = /^(?:\[\[nodiscard\]\]\s*)?(?:static\s+)?bool\s+(?:Is|Has|Can|Completes)[A-Za-z0-9_]*\s*\(|operator==/
const DECL_KEYWORDS = /^(class|struct|union|enum|namespace|using|typedef|template|#|if|else|for|while|switch|return|case|default)\b/

function usage(message) {
  if (message) process.stderr.write(`错误：${message}\n`)
  process.stderr.write('用法：node checking-comments.mjs [--root DIR] [--width N] [--banner-width N] [--no-header] [--json] [--quiet]\n')
  return EXIT.usage
}

function parseArgs(argv) {
  const options = { root: undefined, width: 80, bannerWidth: 80, widthExplicit: false, bannerWidthExplicit: false, requireHeader: true, json: false, quiet: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') {
      options.root = argv[index + 1]
      index += 1
    } else if (arg === '--width') {
      options.width = Number(argv[index + 1])
      options.widthExplicit = true
      index += 1
    } else if (arg === '--banner-width') {
      options.bannerWidth = Number(argv[index + 1])
      options.bannerWidthExplicit = true
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

/** 从工程 .clang-format 读取 ColumnLimit；没有配置时返回 undefined。 */
function readColumnLimit(root) {
  const dir = statSync(root).isDirectory() ? root : path.dirname(root)
  try {
    const text = readFileSync(path.join(dir, '.clang-format'), 'utf8')
    const match = text.match(/^\s*ColumnLimit:\s*(\d+)\s*$/m)
    return match ? Number(match[1]) : undefined
  } catch {
    return undefined
  }
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

/** 标记每一行是否位于 class/struct 体内，供数据成员注释位置检查使用。 */
function classMemberLines(lines) {
  const flags = new Array(lines.length).fill(false)
  const starts = []
  let depth = 0
  let pending = false
  for (let index = 0; index < lines.length; index += 1) {
    const code = lines[index].replace(/\/\/.*$/, '').trim()
    if (/^(?:template\s*<[^>]*>\s*)?(?:class|struct)\b/.test(code)) pending = true
    const opens = (code.match(/\{/g) ?? []).length
    const closes = (code.match(/\}/g) ?? []).length
    if (pending && opens > 0) {
      starts.push(depth)
      pending = false
    } else if (pending && opens === 0 && code.endsWith(';')) {
      pending = false
    }
    flags[index] = starts.length > 0 && depth > starts[starts.length - 1]
    depth += opens - closes
    while (starts.length > 0 && depth <= starts[starts.length - 1]) starts.pop()
  }
  return flags
}

/** 检查一段文本，返回问题列表；每个问题带 1 起始的行号。 */
export function checkText(text, options = {}) {
  const width = options.width ?? 80
  const bannerWidth = options.bannerWidth ?? 80
  const requireHeader = options.requireHeader ?? true
  const lines = text.split(/\r?\n/)
  const issues = []
  const add = (line, rule, message) => issues.push({ line, rule, message })
  const inClass = classMemberLines(lines)

  const firstContent = lines.findIndex((line) => line.trim() !== '')
  const firstTrimmed = firstContent === -1 ? '' : lines[firstContent].trim()
  const hasDoxyHeader = DOXY_FILE.test(firstTrimmed)
  let doxyHeaderEnd = -1
  if (hasDoxyHeader) {
    doxyHeaderEnd = firstContent
    while (doxyHeaderEnd + 1 < lines.length && lines[doxyHeaderEnd + 1].trim().startsWith('///')) doxyHeaderEnd += 1
  }
  if (requireHeader && firstContent !== -1 && !BANNER.test(firstTrimmed) && !hasDoxyHeader) {
    add(firstContent + 1, 'header-missing', '文件开头缺少文件头：写 /// @file <文件名>，下一行写 /// @brief')
  }
  if (firstContent !== -1 && (BANNER.test(firstTrimmed) || hasDoxyHeader)) {
    const own = options.fileName ? options.fileName.split(/[\\/]/).pop() : ''
    const bannerHeader = BANNER.test(firstTrimmed)
    if (hasDoxyHeader && !DOXY_BRIEF.test((lines[firstContent + 1] ?? '').trim())) {
      add(firstContent + 2, 'header-brief', '文件头第二行缺少 /// @brief 一句话说明')
    }
    for (let index = firstContent + 1; index < lines.length; index += 1) {
      const trimmed = lines[index].trim()
      if (bannerHeader ? BANNER.test(trimmed) || !trimmed.startsWith('//') : !trimmed.startsWith('///')) break
      const names = trimmed.match(/\b[A-Za-z0-9_-]+\.(?:h|hpp|cpp|cc)\b/g) ?? []
      const fileMatches = trimmed.match(/@file\s+(\S+)/)
      const namesToCheck = fileMatches ? names.filter((name) => name !== fileMatches[1]) : names
      for (const name of namesToCheck) {
        if (name !== own) add(index + 1, 'header-cross-file', `文件头提到了别的源文件 ${name}：只介绍本文件，删掉跨文件句子`)
      }
      if (/\bapps\//.test(trimmed)) add(index + 1, 'header-cross-file', '文件头指向了另一个目录：只介绍本文件')
    }
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
    if (doxyHeaderEnd !== -1 && index <= doxyHeaderEnd) {
      index = doxyHeaderEnd
      continue
    }
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
      add(start + 1, 'forward-ref', '类型注释在交代别的类型负责什么：只写本类型的契约，删掉这句，不要挪到文件头')
    }
    if (isType && TYPE_SYSTEM.test(block)) {
      add(start + 1, 'type-system', '类型注释在复述类型系统已表达的性质：可拷贝与 const 查询由声明给出，删掉这句')
    }
    if (isType && NEGATED_BOUNDARY.test(block)) {
      add(start + 1, 'negated-boundary', '类型注释用「只保存/不拥有/不含」写否定式边界：改成名词短语，边界交给成员类型表达')
    }
    if (isType && DOMAIN_SIZE.test(block)) {
      add(start + 1, 'domain-size', '类型注释在写领域尺寸：格子数由 cells_ 之类成员声明表达，删掉这句')
    }
    const firstDocLine = lines[start].trim().replace(/^\/\/\/\s*/, '')
    if (!isType && PREDICATE_DECL.test(declaration) && !firstDocLine.startsWith('检查')) {
      add(start + 1, 'predicate-first', '布尔查询或 operator== 的第一句应写「检查…是否…」')
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

  for (let index = 0; index + 1 < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (!trimmed.startsWith('//') || trimmed.startsWith('///') || trimmed.startsWith('//!')) continue
    const next = lines[index + 1].trim()
    if (next === '' || next.startsWith('//')) continue
    if (!/(下标|存储|对应坐标|行优先|存放)/.test(trimmed)) continue
    const identifiers = next.match(/[A-Za-z_]\w*/g) ?? []
    if (!identifiers.some((identifier) => trimmed.includes(identifier))) continue
    let residue = trimmed
    for (const identifier of identifiers) residue = residue.split(identifier).join('')
    residue = residue.replace(
      /(对应坐标|行优先|下标|存储|存放|声明|类型|棋盘|格子|元素|坐标|行列|行|列|当前|每个|所有|用来|用于|表示|保存|初始化|的是|的了|在|中|里|和|与|及|或|按|class|struct|enum|const|auto|row|col|index|indices|cell|cells|board|data|value|values)/g,
      '',
    )
    residue = residue.replace(/[\s\p{P}\p{S}\p{N}]/gu, '')
    if (residue === '') {
      add(index + 1, 'restates-next', '实现注释只重复下一行声明的标识符或类型：删掉这句，让声明自己表达')
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (!inClass[index]) continue
    const line = lines[index]
    const commentAt = line.indexOf('//')
    const code = (commentAt === -1 ? line : line.slice(0, commentAt)).trim()
    if (!code.endsWith(';') || code.includes('(')) continue
    const names = code.match(/\b[A-Za-z_]\w*_\b/g)
    if (!names) continue
    const member = names.at(-1)
    const previous = index > 0 ? lines[index - 1].trim() : ''
    if (commentAt !== -1) {
      if (line.slice(commentAt).startsWith('///<')) continue
      if (!previous.startsWith('//')) {
        add(index + 1, 'member-comment-missing', `数据成员 ${member} 只有行尾注释：主注释写在声明上一行，行尾不写补充`)
      } else {
        add(index + 1, 'member-comment-trailing', `数据成员 ${member} 的行尾注释应删掉：主注释只写在声明上一行，行尾只允许 ///< 用于枚举项或 struct 短字段`)
      }
    } else if (previous.startsWith('//') && !previous.startsWith('///')) {
      add(index + 1, 'member-comment-slash', `数据成员 ${member} 的主注释用了 //：类数据成员统一用 ///，写在声明上一行`)
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

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('///') || !/\bnoexcept\b/.test(trimmed)) continue
    let bodyStart = index
    if (!trimmed.includes('{')) {
      let next = index + 1
      while (next < lines.length && lines[next].trim() === '') next += 1
      if (next >= lines.length || !lines[next].trim().startsWith('{')) continue
      bodyStart = next
    }
    const afterBrace = trimmed.slice(trimmed.indexOf('{') + 1)
    if (afterBrace.includes('.at(')) {
      add(index + 1, 'noexcept-throws', 'noexcept 函数体内调用 at()：越界会抛 std::out_of_range，去掉 noexcept 或改用 [] 与显式越界检查')
      continue
    }
    for (let cursor = bodyStart + 1; cursor < lines.length; cursor += 1) {
      if (/^\}/.test(lines[cursor])) break
      if (lines[cursor].includes('.at(')) {
        add(cursor + 1, 'noexcept-throws', 'noexcept 函数体内调用 at()：越界会抛 std::out_of_range，去掉 noexcept 或改用 [] 与显式越界检查')
        break
      }
    }
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
  const columnLimit = readColumnLimit(root)
  if (columnLimit !== undefined) {
    if (!options.widthExplicit) options.width = columnLimit
    if (!options.bannerWidthExplicit) options.bannerWidth = columnLimit
  }
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
    for (const issue of checkText(text, { ...options, fileName: path.relative(root, file) || file })) results.push({ file: path.relative(root, file) || file, ...issue })
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
