#!/usr/bin/env node
// 只读检查 `.cpp` 中成员函数的定义顺序是否跟随配对头文件的声明顺序。
//
// 规则见 references/layout/03-declaration-order.md「`.cpp` 的定义顺序」：
// 先类型常量、再自由函数、再成员函数；成员按类内声明顺序；构造函数、析构函数、
// 拷贝与移动放在成员组最前；不为先编译而重排。
//
// 本脚本只比较能在配对头文件里找到声明的类成员；自由函数与匿名命名空间不参与，
// 头文件里没有声明的定义直接跳过，避免把另一个头文件的实现误报成乱序。
//
// 用法：
//   node checking-declaration-order.mjs [--root DIR] [--json] [--quiet]
//
// 退出码：0 无问题，1 发现乱序，2 用法或读取错误。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const EXIT = { ok: 0, issues: 1, usage: 2 }

const HEADER_EXT = new Set(['.h', '.hh', '.hpp', '.hxx', '.h++', '.inl', '.ipp', '.tpp'])
const SOURCE_EXT = new Set(['.cpp', '.cc', '.cxx', '.c++'])
const SKIP_DIR = new Set([
  '.git', '.hg', '.svn', 'build', 'build-release', 'out', 'node_modules', '_book', '.quarto',
  '.cache', '.tmp', 'temp', 'third_party', 'third-party', 'external', 'vendor', 'deps',
  'cmake-build-debug', 'cmake-build-release', '.vs', '.idea',
])
const PREDICATE_NAME = /^(?:Is|Has|Can|Completes|Would)[A-Za-z0-9_]*$/

function usage(message) {
  if (message) process.stderr.write(`错误：${message}\n`)
  process.stderr.write('用法：node checking-declaration-order.mjs [--root DIR] [--json] [--quiet]\n')
  return EXIT.usage
}

function parseArgs(argv) {
  const options = { root: undefined, json: false, quiet: false, help: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') {
      options.root = argv[index + 1]
      if (!options.root) throw new Error('--root 需要目录')
      index += 1
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--quiet') {
      options.quiet = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }
  return options
}

/** 去掉注释与字符串，保留换行，便于按行号定位。 */
export function stripCommentsAndStrings(text) {
  const out = text.split('')
  let index = 0
  while (index < text.length) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') out[index++] = ' '
      continue
    }
    if (char === '/' && next === '*') {
      out[index++] = ' '
      out[index++] = ' '
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        if (text[index] !== '\n') out[index] = ' '
        index += 1
      }
      if (index < text.length) {
        out[index++] = ' '
        out[index++] = ' '
      }
      continue
    }
    if (char === 'R' && next === '"') {
      const open = text.indexOf('(', index + 2)
      if (open !== -1) {
        const delimiter = text.slice(index + 2, open)
        const close = text.indexOf(`)${delimiter}"`, open + 1)
        const end = close === -1 ? text.length : close + delimiter.length + 2
        for (; index < end; index += 1) if (text[index] !== '\n') out[index] = ' '
        continue
      }
    }
    if (char === '"' || char === "'") {
      const quote = char
      out[index++] = ' '
      while (index < text.length) {
        if (text[index] === '\\') {
          out[index++] = ' '
          if (index < text.length) out[index++] = ' '
          continue
        }
        if (text[index] === quote) {
          out[index++] = ' '
          break
        }
        if (text[index] !== '\n') out[index] = ' '
        index += 1
      }
      continue
    }
    index += 1
  }
  return out.join('')
}

function lineAt(text, index) {
  let line = 1
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text[cursor] === '\n') line += 1
  }
  return line
}

function matchBrace(text, open) {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1
    else if (text[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

/** 收集头文件里的 class/struct 名称与类体范围。 */
export function findClasses(text) {
  const code = stripCommentsAndStrings(text)
  const classes = []
  const pattern = /\b(class|struct)\s+([A-Za-z_]\w*)\b[^;{}]*\{/g
  let match
  while ((match = pattern.exec(code)) !== null) {
    const keyword = match[1]
    const name = match[2]
    const before = code.slice(Math.max(0, match.index - 6), match.index)
    if (keyword === 'class' && /enum\s*$/.test(before)) continue
    const open = code.indexOf('{', match.index)
    const close = matchBrace(code, open)
    if (close === -1) continue
    classes.push({ name, body: code.slice(open + 1, close), bodyStart: open + 1 })
    pattern.lastIndex = close + 1
  }
  return classes
}

function normalizeStatement(statement) {
  return statement
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 从一个类体里按声明顺序提取可定义的成员函数名。 */
export function classMembers(body) {
  const clean = body.replace(/\b(public|private|protected)\s*:/g, ' ')
  const members = []
  let index = 0
  while (index < clean.length) {
    while (index < clean.length && /\s/.test(clean[index])) index += 1
    if (index >= clean.length) break
    if (clean[index] === '{') {
      const close = matchBrace(clean, index)
      if (close === -1) break
      index = close + 1
      while (index < clean.length && /[\s;]/.test(clean[index])) index += 1
      continue
    }
    const start = index
    let paren = 0
    let angle = 0
    let brace = 0
    for (; index < clean.length; index += 1) {
      const char = clean[index]
      if (char === '(') paren += 1
      else if (char === ')') paren = Math.max(0, paren - 1)
      else if (char === '<') angle += 1
      else if (char === '>') angle = Math.max(0, angle - 1)
      else if (char === '{') brace += 1
      else if (char === '}') {
        if (brace === 0) break
        brace -= 1
      } else if (char === ';' && paren === 0 && brace === 0) break
    }
    const statement = clean.slice(start, index)
    index += 1
    const text = normalizeStatement(statement)
    if (!text || /^(using|typedef|friend\s+class|static_assert|enum|class|struct|union|namespace)\b/.test(text)) {
      continue
    }
    if (!text.includes('(')) continue
    const name = memberName(text)
    if (name) members.push({ name, text })
  }
  return members
}

function memberName(text) {
  let value = text
    .replace(/^template\s*<[^>]*>\s*/, '')
    .replace(/^(?:static|inline|virtual|constexpr|consteval|explicit|friend|extern)\s+/g, '')
    .trim()
  const operator = /(?:^|\s)(operator\s*[^\s(]+)\s*\(/.exec(value)
  if (operator) return operator[1].replace(/\s+/g, ' ')
  const destructor = /(?:^|\s)(~[A-Za-z_]\w*)\s*\(/.exec(value)
  if (destructor) return destructor[1]
  const constructor = /(?:^|\s)([A-Za-z_]\w*)\s*\(/.exec(value)
  if (constructor && (value.startsWith(`${constructor[1]}(`) || /\bexplicit\s+$/.test(value.slice(0, constructor.index + 1)))) {
    return constructor[1]
  }
  const fn = /([A-Za-z_]\w*)\s*\(/.exec(value)
  return fn ? fn[1] : undefined
}

/** 找出 `.cpp` 中形如 `Type Class::Name(` 的定义及其行号。 */
export function cppDefinitions(text) {
  const code = stripCommentsAndStrings(text)
  const definitions = []
  const lines = code.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const match = /^\s*(?:template\s*<[^>]*>\s*)?(?:[A-Za-z_][\w:<>,\s*&]*?\s+)?([A-Za-z_]\w*)::(~?[A-Za-z_]\w*|operator\s*[^\s(]+)\s*\(/.exec(line)
    if (!match) continue
    definitions.push({
      className: match[1],
      name: match[2].replace(/\s+/g, ' '),
      line: index + 1,
      text: line.trim(),
    })
  }
  return definitions
}

/** 检查头文件类内谓词是否排在 Get 之后。 */
export function checkHeaderOrder(headerText) {
  const classes = findClasses(headerText)
  const issues = []
  for (const item of classes) {
    const members = classMembers(item.body)
    let seenGet = false
    for (const member of members) {
      if (member.name.startsWith('Get')) {
        seenGet = true
        continue
      }
      if (!seenGet || !PREDICATE_NAME.test(member.name)) continue
      const index = headerText.search(new RegExp(`\\b${member.name}\\s*\\(`))
      const line = index === -1 ? 1 : headerText.slice(0, index).split('\n').length
      issues.push({
        line,
        rule: 'header-order',
        message: `${item.name}::${member.name} 是谓词，却排在 Get 之后；谓词 Is / Has / Can / Completes / Would 应放在 Get 之前。`,
      })
    }
  }
  return issues
}

/** 比较一个头文件与一个实现文件；返回乱序问题。 */
export function checkPair(headerText, cppText, fileName = '') {
  const classes = findClasses(headerText)
  const definitions = cppDefinitions(cppText)
  const issues = checkHeaderOrder(headerText)
  for (const item of classes) {
    const members = classMembers(item.body)
    if (members.length === 0) continue
    const declared = members.map((member) => member.name)
    const defined = definitions.filter((definition) => definition.className === item.name)
    let cursor = 0
    let previous
    for (const definition of defined) {
      let found = declared.indexOf(definition.name, cursor)
      if (found === -1 && declared.includes(definition.name)) {
        issues.push({
          line: definition.line,
          rule: 'definition-order',
          message: `${item.name}::${definition.name} 出现在 ${previous ? `${item.name}::${previous} 之后` : '成员组开头'}；头文件声明的顺序是 ${declared.join(' → ')}。`,
        })
        continue
      }
      if (found === -1) continue
      cursor = found + 1
      previous = definition.name
    }
  }
  return issues.map((issue) => ({ file: fileName, ...issue }))
}

function collectFiles(root) {
  const files = { headers: [], sources: [] }
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIR.has(entry.name.toLowerCase()) || entry.name.startsWith('.')) continue
        walk(full)
        continue
      }
      if (!entry.isFile()) continue
      const extension = path.extname(entry.name).toLowerCase()
      if (HEADER_EXT.has(extension)) files.headers.push(full)
      if (SOURCE_EXT.has(extension)) files.sources.push(full)
    }
  }
  if (statSync(root).isFile()) {
    const extension = path.extname(root).toLowerCase()
    if (HEADER_EXT.has(extension)) files.headers.push(root)
    if (SOURCE_EXT.has(extension)) files.sources.push(root)
  } else {
    walk(root)
  }
  files.headers.sort()
  files.sources.sort()
  return files
}

export function checkRoot(root) {
  const files = collectFiles(root)
  const headers = new Map()
  for (const file of files.headers) {
    const stem = path.basename(file, path.extname(file))
    const bucket = headers.get(stem) ?? []
    bucket.push(file)
    headers.set(stem, bucket)
  }
  const pairs = []
  const issues = []
  for (const file of files.sources) {
    const stem = path.basename(file, path.extname(file))
    const candidates = headers.get(stem) ?? []
    if (candidates.length !== 1) continue
    const header = candidates[0]
    const headerText = readFileSync(header, 'utf8')
    const cppText = readFileSync(file, 'utf8')
    const relative = path.relative(root, file) || file
    const found = checkPair(headerText, cppText, relative)
    pairs.push({ header, source: file, issues: found })
    issues.push(...found)
  }
  return { pairs, issues }
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
  try {
    statSync(root)
  } catch {
    return usage(`根目录不存在或无法读取：${root}`)
  }
  let result
  try {
    result = checkRoot(root)
  } catch (error) {
    return usage(`读取 ${root} 失败：${error.message}`)
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ root, pairs: result.pairs.length, issues: result.issues }, null, 2)}\n`)
  } else if (result.issues.length > 0) {
    for (const issue of result.issues) process.stdout.write(`${issue.file}:${issue.line}: [${issue.rule}] ${issue.message}\n`)
    process.stdout.write(`发现 ${result.issues.length} 处定义顺序问题。\n`)
  } else if (!options.quiet) {
    process.stdout.write(`定义顺序检查通过：${result.pairs.length} 对头文件与实现文件。\n`)
  }
  return result.issues.length === 0 ? EXIT.ok : EXIT.issues
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2))
}
