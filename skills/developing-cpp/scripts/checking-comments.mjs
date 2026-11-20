#!/usr/bin/env node
// 只读注释审计：按 references/comments/01-comment-rules.md 的硬规则检查 C/C++ 源文件。
//
// 检查项：Doxygen 文件头、注释行宽度（含行首缩进）、列表缩进、标签、标签间空行、注释与声明的贴合、
// 成员功能清单、设计论证（方案对比）、否定式边界、领域尺寸、谓词首句、@param 完整性、@return 完整性、
// @retval 顺序、特殊成员首句、函数体内 ///、摘要裸参数名、枚举成员注释一致性、枚举行尾句式（不收句号）、
// 数据成员主注释位置、控制序列常量注释、定义处重复声明注释、只在 .cpp 出现的函数契约；
// 另查实现注释复述下一行声明、指向别的头文件或目录、注释代替类型、能力边界、枚举行尾空冒号。
// 不重写任何文件。
//
// 用法：
//   node checking-comments.mjs [--root DIR] [--width N] [--comment-style slash|block] [--no-header] [--no-brief] [--no-param] [--no-return] [--allow-tag TAG] [--json] [--quiet] [--help]
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
const CPP_EXT = new Set(['.cpp', '.cc', '.cxx', '.c++', '.c'])
const SKIP_DIR = new Set([
    '.git', '.hg', '.svn', 'build', 'build-release', 'out', 'node_modules', '_book', '.quarto', '.cache',
    '.tmp', 'temp', 'third_party', 'third-party', 'external', 'vendor', 'deps', 'cmake-build-debug',
    'cmake-build-release', '.vs', '.idea',
])
const STATIC_FORBIDDEN_TAGS = ['@returns', '@details', '@since', '@todo']
const PRIVACY_TAGS = ['@author', '@date', '@copyright', '@version']
const FORBIDDEN_TAGS = [...STATIC_FORBIDDEN_TAGS, ...PRIVACY_TAGS]
const DOXY_FILE = /^\/\/\/\s*@file\s+\S/
const DOXY_BRIEF = /^\/\/\/\s*@brief\s+\S/
const BLOCK_FILE = /^@file\s+\S/
const BLOCK_BRIEF = /^@brief\s+\S/
const MEMBER_LIST = /提供[^。]{0,40}、[^。]{0,40}(的功能|的能力|的接口)|功能[:：]/
const CALLER_LIST = /调用/
const MEMBER_REF = /`(?:Get|Set|Clear|Is|Has|Can|Completes|Would|Check|ToIndex|Place|Undo|Choose)[A-Za-z0-9_]*`/
const RATIONALE = /而不是|而非|代价.{0,4}忽略|只留一份|与其|比.{0,12}更|更(?:安全|快|清楚|直接|好写|难写)/
const FORWARD_REF = /(?:留在|归|交给|由)\s*`?[A-Z][A-Za-z0-9_]*`?/
const TYPE_SYSTEM = /值语义|自由拷贝/
const NEGATED_BOUNDARY = /只保存|不拥有|不含/
const NEGATIVE_SCOPE = /不(?:检查|校验|验证|负责|判断)/
const ESCAPE_SEQUENCE = /\\033|\\x1[bB]|\\e(?![A-Za-z0-9])/
const STRING_SEQUENCE_CONSTANT = /^(?:static\s+)?(?:inline\s+)?constexpr\s+(?:std::string_view|(?:const\s+)?char\s*(?:const\s*)?\*)\s+([A-Za-z_]\w*)\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/
const CHAR_SEQUENCE_CONSTANT = /^(?:static\s+)?(?:inline\s+)?constexpr\s+char\s+([A-Za-z_]\w*)\s*=\s*'(\\033|\\x1[bB]|\\e)'\s*;/
const SEQUENCE_FIRST = /的(?:控制|转义)序列(?:：.+)?。$/
const DOMAIN_SIZE = /\d+\s*[×xX]\s*\d+|\d+\s*行\s*\d+\s*列|九个?方?格|边长/
const SPECIAL_MEMBER_VAGUE = /创建对象|建立初始状态|初始化成员/
const PREDICATE_DECL = /^(?:\[\[nodiscard\]\]\s*)?(?:static\s+)?bool\s+(?:Is|Has|Can|Completes|Would)[A-Za-z0-9_]*\s*\(|operator==/
const PREDICATE_BANNED_PREFIX = /^(?:检查|判断|校验|验证)/
const isPredicateFirstOk = (declaration, firstDocLine) =>
    declaration.includes('operator==')
        ? firstDocLine.startsWith('相等运算符')
        : firstDocLine.includes('是否') && !PREDICATE_BANNED_PREFIX.test(firstDocLine)
const DECL_KEYWORDS = /^(class|struct|union|enum|namespace|using|typedef|template|#|if|else|for|while|switch|return|case|default)\b/

const USAGE = '用法：node checking-comments.mjs [--root DIR] [--width N] [--comment-style slash|block] [--no-header] [--no-brief] [--no-param] [--no-return] [--allow-tag TAG] [--json] [--quiet] [--help]\n'

function usage(message) {
    if (message) process.stderr.write(`错误：${message}\n`)
    process.stderr.write(USAGE)
    return EXIT.usage
}

function help() {
    process.stdout.write(USAGE)
    return EXIT.ok
}

function parseArgs(argv) {
    const options = { root: undefined, width: 120, widthExplicit: false, commentStyle: 'slash', requireHeader: true, requireBrief: true, requireParam: true, requireReturn: true, allowTags: new Set(), json: false, quiet: false }
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]
        if (arg === '--root') {
            options.root = argv[index + 1]
            index += 1
        } else if (arg === '--width') {
            options.width = Number(argv[index + 1])
            options.widthExplicit = true
            index += 1
        } else if (arg === '--comment-style') {
            const value = argv[index + 1]
            if (value !== 'slash' && value !== 'block') throw new Error('--comment-style 只接受 slash 或 block')
            options.commentStyle = value
            index += 1
        } else if (arg === '--no-header') {
            options.requireHeader = false
        } else if (arg === '--no-brief') {
            options.requireBrief = false
        } else if (arg === '--no-param') {
            options.requireParam = false
        } else if (arg === '--no-return') {
            options.requireReturn = false
        } else if (arg === '--allow-tag') {
            const value = argv[index + 1]
            if (!value) throw new Error('--allow-tag 需要标签名，例如 author')
            options.allowTags.add(value.replace(/^@/, ''))
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
    if (!Number.isInteger(options.width) || options.width < 40) {
        throw new Error('--width 需要不小于 40 的整数')
    }
    return options
}

/** 从指定目录的 .clang-format 读取 ColumnLimit；没有配置时返回 undefined。 */
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

/** 从文件所在目录向上查找最近的 .clang-format，直到工程根。 */
function readColumnLimitNear(file, root) {
    const stop = path.resolve(root)
    let dir = path.dirname(path.resolve(file))
    while (true) {
        const limit = readColumnLimit(dir)
        if (limit !== undefined) return limit
        if (dir === stop) return undefined
        const parent = path.dirname(dir)
        if (parent === dir) return undefined
        dir = parent
    }
}

/** 中文按两列、tab 按 4 列计宽，用于判断渲染后的行宽。 */
export function displayWidth(text) {
    let width = 0
    for (const char of text) {
        if (char === '\t') {
            width += 4 - (width % 4)
            continue
        }
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

const TAG_GROUPS = {
    param: 'param',
    tparam: 'param',
    return: 'return',
    returns: 'return',
    retval: 'return',
    result: 'return',
    throws: 'throws',
    throw: 'throws',
    exception: 'throws',
    note: 'note',
    see: 'note',
    pre: 'pre',
    post: 'pre',
}

/** 取标签所属分组；参数、返回值、异常、前置条件、说明各成一组。 */
function tagGroupOf(tag) {
    const name = tag.slice(1).toLowerCase().split(/[\s{[(]/)[0]
    return TAG_GROUPS[name] ?? 'other'
}

/** 分组之间允许空行；同一分组内出现空行才算标签粘连。摘要与首个标签之间的空行另由 brief-tag-gap 检查。 */
function hasTagGap(contents) {
    let lastGroup = null
    let pendingGap = false
    for (const content of contents) {
        const trimmed = content.trim()
        if (trimmed.startsWith('@')) {
            const group = tagGroupOf(trimmed)
            if (pendingGap && lastGroup === group) return true
            pendingGap = false
            lastGroup = group
            continue
        }
        if (trimmed === '') {
            if (lastGroup !== null) pendingGap = true
            continue
        }
        // 空行后接正文是标签说明内的段落，不是分组分隔，取消待定空行
        pendingGap = false
    }
    return false
}

/** 摘要或详细描述与首个标签之间必须有空行。 */
function hasBriefTagGap(contents) {
    let sawText = false
    for (let index = 0; index < contents.length; index += 1) {
        const trimmed = contents[index].trim()
        if (trimmed.startsWith('@')) {
            return sawText && index > 0 && contents[index - 1].trim() !== ''
        }
        if (trimmed !== '') sawText = true
    }
    return false
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

/** 参数片段里只可能是类型的关键字：末词命中即说明这个参数没写名字。 */
const TYPE_WORDS = new Set([
    'const', 'volatile', 'signed', 'unsigned',
    'void', 'bool', 'char', 'short', 'int', 'long', 'float', 'double', 'auto',
    'wchar_t', 'char8_t', 'char16_t', 'char32_t',
])

/** 取参数名：去掉默认值与数组后缀；不具名参数返回 undefined。 */
function paramName(part) {
    let text = part
    if (text.includes('=')) text = text.slice(0, text.indexOf('='))
    text = text.replace(/\[[^\]]*\]/g, ' ').trim()
    if (text === '...') return undefined
    const pointer = text.match(/\(\s*[*&]+\s*([A-Za-z_]\w*)\s*\)/)
    if (pointer) return pointer[1]
    if (/[&*>]$/.test(text)) return undefined
    const tokens = text.match(/[A-Za-z_]\w*/g) ?? []
    const last = tokens.at(-1)
    if (!last) return undefined
    if (TYPE_WORDS.has(last)) return undefined
    if (text.endsWith(`::${last}`)) return undefined
    const bare = tokens.filter((token) => !['const', 'volatile'].includes(token))
    if (bare.length < 2) return undefined
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

/** 从 start 起拼接跨行声明，直到见到结尾的 `;` 或 `{`。 */
function joinedDeclaration(lines, start) {
    let declaration = lines[start].trim()
    let end = start
    while (!/[;{]\s*$/.test(declaration) && end + 1 < lines.length && end - start < 20) {
        end += 1
        declaration = `${declaration} ${lines[end].trim()}`
    }
    return declaration
}

/** 收集头文件里声明的函数名，供 .cpp 定义处配对；声明可以跨行。 */
function declarationNames(text) {
    const names = new Set()
    let buffer = ''
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('#')) continue
        buffer = buffer === '' ? trimmed : `${buffer} ${trimmed}`
        if (!buffer.includes(';')) continue
        const declaration = buffer
        buffer = ''
        if (/^(if|for|while|switch|catch|else|return|case|default|do)\b/.test(declaration)) continue
        const match = declaration.match(/^(.*?)\b([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?(?:final\s*)?(?:=\s*(?:0|default|delete)\s*)?;$/)
        if (match) names.add(match[2])
    }
    return names
}

/** 取定义行上的函数名、返回类型与参数名；签名可跨行，非定义返回 undefined。 */
function definitionAt(lines, index) {
    const line = lines[index]
    if (line.trim() === '' || /^\s*(\/\/|\/\*|\*)/.test(line) || /^\s*#/.test(line)) return undefined
    if (/^\s*(if|for|while|switch|catch|else|return|case|default|do)\b/.test(line)) return undefined
    if (/^\s*[A-Z][A-Z0-9_]*\s*\(/.test(line)) return undefined
    if (/^\s*~[A-Za-z_]\w*\s*\(/.test(line)) return undefined
    // 定义的首行必须出现参数表左括号；类头、namespace、控制语句等不参与。
    if (!line.includes('(')) return undefined
    const pattern = /^(\s*)(.*?)\b([A-Za-z_]\w*)\s*\(((?:[^()]|\([^()]*\))*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:->\s*[^{;]+)?\{\s*.*$/
    let match = line.match(pattern)
    if (!match) {
        // 签名被换行拆开时续拼，直到出现函数体左花括号、语句结束或超出上限。
        let buffer = line
        for (let next = index + 1; next < lines.length && next <= index + 12; next += 1) {
            buffer = `${buffer} ${lines[next].trim()}`
            match = buffer.match(pattern)
            if (match) break
            if (/[;}]/.test(lines[next])) break
        }
    }
    if (!match) return undefined
    const prefix = match[2].trim()
    if (/^(if|for|while|switch|catch|else|return|case|default|do)$/.test(match[3])) return undefined
    if (prefix.endsWith('::~')) return undefined
    const returnType = prefix.replace(/[A-Za-z_]\w*::$/, '').trim()
    return { name: match[3], returnType, params: splitParams(match[4]).map(paramName).filter(Boolean) }
}

/** 取定义上一行紧贴的 /// 文档块。 */
function docAbove(lines, index) {
    let cursor = index - 1
    if (cursor < 0 || !lines[cursor].trim().startsWith('///')) return undefined
    const contents = []
    let start = cursor
    while (cursor >= 0 && lines[cursor].trim().startsWith('///')) {
        contents.unshift(lines[cursor].trim().replace(/^\/\/\/\s?/, ''))
        start = cursor
        cursor -= 1
    }
    return { start, contents }
}

/** 统计一行代码里花括号的净增量，忽略注释与字符串字面量。 */
function braceDelta(line) {
    let depth = 0
    let quote = ''
    let block = false
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        const next = line[index + 1]
        if (block) {
            if (char === '*' && next === '/') {
                block = false
                index += 1
            }
            continue
        }
        if (quote) {
            if (char === '\\') {
                index += 1
                continue
            }
            if (char === quote) quote = ''
            continue
        }
        if (char === '/' && next === '/') break
        if (char === '/' && next === '*') {
            block = true
            index += 1
            continue
        }
        if (char === '"' || char === "'") {
            quote = char
            continue
        }
        if (char === '{') depth += 1
        else if (char === '}') depth -= 1
    }
    return depth
}

/** 取定义体的行范围：左花括号行到深度回零的收尾行；找不到左花括号时返回 undefined。 */
function bodyRange(lines, index) {
    let start = -1
    for (let cursor = index; cursor < lines.length && cursor <= index + 12; cursor += 1) {
        if (lines[cursor].includes('{')) {
            start = cursor
            break
        }
        if (cursor > index && /[;}]/.test(lines[cursor])) break
    }
    if (start === -1) return undefined
    let depth = 0
    for (let cursor = start; cursor < lines.length; cursor += 1) {
        depth += braceDelta(lines[cursor])
        if (depth <= 0) return { start, end: cursor }
    }
    return { start, end: lines.length - 1 }
}

/** 检查 .cpp 定义处的注释落点：函数体内用 // 写实现注释，头文件已声明的定义不写 ///，只在 .cpp 出现的函数写完整契约。 */
export function checkDefinitionDocs(text, headerNames = new Set(), options = {}) {
    const issues = []
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
        const definition = definitionAt(lines, index)
        if (!definition) continue
        const body = bodyRange(lines, index)
        if (body) {
            for (let cursor = body.start; cursor <= body.end; cursor += 1) {
                if (lines[cursor].trim().startsWith('///')) {
                    issues.push({ line: cursor + 1, rule: 'doc-in-body', message: '函数体内用 // 写实现注释：/// 会接到函数的 Doxygen 详细说明后面' })
                }
            }
        }
        if (definition.name === 'main' || definition.name.startsWith('operator')) continue
        const doc = docAbove(lines, index)
        if (headerNames.has(definition.name)) {
            if (doc) {
                issues.push({ line: doc.start + 1, rule: 'doc-on-definition', message: '定义处重复了头文件声明注释：删掉这里的 ///，契约留在声明处' })
            }
            continue
        }
        const needParam = options.requireParam !== false && definition.params.length > 0
        const needReturn = options.requireReturn !== false && definition.returnType !== '' && definition.returnType !== 'void'
        if (!needParam && !needReturn) continue
        const wanted = [needParam ? '@param' : '', needReturn ? '@return' : ''].filter(Boolean).join('/')
        if (!doc) {
            issues.push({ line: index + 1, rule: 'cpp-contract-missing', message: `只在 .cpp 出现的函数缺少完整契约：在定义上一行补 ${wanted}` })
            continue
        }
        const block = doc.contents.join('\n')
        if (needParam) {
            const documented = [...block.matchAll(/@param(?:\[[^\]]*\])?\s+(\w+)/g)].map((match) => match[1])
            for (const name of definition.params) {
                if (!documented.includes(name)) {
                    issues.push({ line: doc.start + 1, rule: 'cpp-contract-missing', message: `只在 .cpp 出现的函数缺少 @param ${name}：补完整契约` })
                }
            }
        }
        if (needReturn && !/(?:@return|@retval)\b/.test(block)) {
            issues.push({ line: doc.start + 1, rule: 'cpp-contract-missing', message: '只在 .cpp 出现的函数缺少 @return：补完整契约' })
        }
    }
    return issues
}

/**
  * 识别保存控制序列的常量声明，返回常量名；不是则返回 undefined。
  * 只认 `constexpr std::string_view`、`constexpr char*` 与 `constexpr char`，
  * 且字面量里出现 ESC（`\\033`、`\\x1b`、`\\e`）。
  */
function escapedControlConstant(declaration) {
    const text = declaration.trim()
    const string = STRING_SEQUENCE_CONSTANT.exec(text)
    if (string && ESCAPE_SEQUENCE.test(string[2])) return string[1]
    const character = CHAR_SEQUENCE_CONSTANT.exec(text)
    return character ? character[1] : undefined
}

/** 取紧贴在声明上方的文档注释；块注释与 `///` 都认。 */
function attachedDoc(lines, index, style) {
    if (style !== 'block') return docAbove(lines, index)
    let end = index - 1
    if (end < 0 || !lines[end].trim().endsWith('*/')) return undefined
    let start = end
    while (start >= 0 && !lines[start].trim().startsWith('/**')) start -= 1
    if (start < 0) return undefined
    return blockDocAt(lines, start)
}

/** 取函数注释第一段：遇到空行或 Doxygen 标签就结束。 */
function summaryParagraph(contents) {
    const paragraph = []
    for (const line of contents) {
        const text = line.trim()
        if (text === '' || text.startsWith('@')) break
        paragraph.push(text)
    }
    return paragraph.join(' ')
}

/** 判断摘要中是否直接出现了参数名。 */
function mentionsParam(text, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(text)
}

/** 标记每一行是否位于 class/struct 体内，供数据成员注释位置检查使用。 */
function classMemberLines(lines, kinds = 'class|struct') {
    const flags = new Array(lines.length).fill(false)
    const starts = []
    let depth = 0
    let pending = false
    for (let index = 0; index < lines.length; index += 1) {
        const code = lines[index].replace(/\/\/.*$/, '').trim()
        if (new RegExp(`^(?:template\\s*<[^>]*>\\s*)?(?:${kinds})\\b`).test(code)) pending = true
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

/**
  * 取从 `index` 开始的 Doxygen 块注释；不是块注释或没有收尾时返回 undefined。
  * `contents` 去掉开头标记、结尾标记与每行的 `*` 前缀，空行保留为空串。
  */
export function blockDocAt(lines, index) {
    const first = lines[index]?.trim() ?? ''
    if (!first.startsWith('/**') || first.startsWith('/**<')) return undefined
    const contents = []
    if (first.includes('*/')) {
        const inner = first.slice(first.indexOf('/**') + 3, first.lastIndexOf('*/')).trim()
        if (inner) contents.push(inner.replace(/^\*\s?/, '').trim())
        return { start: index, end: index, contents }
    }
    const opening = first.slice(first.indexOf('/**') + 3).trim().replace(/^\*\s?/, '')
    if (opening) contents.push(opening)
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor]
        const trimmed = line.trim()
        if (trimmed.includes('*/')) {
            const before = trimmed.slice(0, trimmed.indexOf('*/')).replace(/^\*\s?/, '').trim()
            if (before) contents.push(before)
            return { start: index, end: cursor, contents }
        }
        contents.push(trimmed.replace(/^\*\s?/, '').trim())
    }
    return undefined
}

/** 取声明去掉模板、属性与限定符后的返回类型；构造函数与析构函数返回空串。 */
function declaredReturnType(declaration) {
    const decl = declaration.trim().replace(/^template\s*<[^>]*>\s*/, '')
    const open = decl.indexOf('(')
    if (open === -1) return ''
    let prefix = decl.slice(0, open).trim()
    if (prefix.includes('~') || prefix.includes('operator')) return ''
    prefix = prefix
        .replace(/\[\[[^\]]*\]\]/g, ' ')
        .replace(/^(?:(?:static|virtual|inline|constexpr|explicit|friend|extern)\s+)+/, '')
        .trim()
    const name = /[A-Za-z_]\w*$/.exec(prefix)
    if (!name) return ''
    return prefix.slice(0, name.index).trim().replace(/[A-Za-z_]\w*::$/, '').trim()
}

/** 判断声明属于哪类特殊成员；是则返回规定的文档首句标签。 */
function specialMemberLabel(declaration) {
    const decl = declaration.trim().replace(/^template\s*<[^>]*>\s*/, '')
    const open = decl.indexOf('(')
    if (open === -1) return undefined
    const prefix = decl
        .slice(0, open)
        .trim()
        .replace(/\[\[[^\]]*\]\]/g, ' ')
        .replace(/^(?:(?:static|virtual|inline|constexpr|explicit|friend|extern)\s+)+/, '')
        .trim()
    if (prefix.includes('operator')) return undefined
    if (prefix.startsWith('~') || /::~$/.test(prefix)) return '析构函数：'
    const name = /[A-Za-z_]\w*$/.exec(prefix)
    if (!name) return undefined
    const owner = name[0]
    const before = prefix.slice(0, name.index).trim().replace(/[A-Za-z_]\w*::$/, '').trim()
    if (before !== '') return undefined
    const close = decl.indexOf(')', open)
    if (close === -1) return undefined
    const params = splitParams(decl.slice(open + 1, close))
    if (params.length === 0) return '默认构造函数：'
    if (params.length > 1) return '构造函数：'
    const match = /^\s*(?:const\s+)?([A-Za-z_][\w:<>]*)\s*(&&|&)\s*(?:[A-Za-z_]\w*)?\s*$/.exec(params[0])
    if (!match || match[1].split('::').pop() !== owner) return '构造函数：'
    return match[2] === '&&' ? '移动构造函数：' : '拷贝构造函数：'
}

/** 检查特殊成员首句与函数返回值文档；返回 { rule, message } 列表。 */
function functionDocIssues(declaration, docContents, options = {}) {
    const issues = []
    const label = specialMemberLabel(declaration)
    const firstLine = docContents.find((content) => content.trim() !== '')?.trim() ?? ''
    if (label) {
        if (!firstLine.startsWith(label)) {
            issues.push({ rule: 'special-member-first', message: `特殊成员注释首句要以「${label}」开头：先写这是哪一类构造或析构，再写后置条件` })
        }
        if (SPECIAL_MEMBER_VAGUE.test(firstLine)) {
            issues.push({ rule: 'special-member-vague', message: '特殊成员注释只在复述「创建对象」「初始化成员」「建立初始状态」：改成具体的后置条件或职责' })
        }
        return issues
    }
    if (!declaration.endsWith(';') || /\bmain\s*\(/.test(declaration)) return issues
    if (functionParams(declaration) === undefined) return issues
    const returnType = declaredReturnType(declaration)
    if (returnType === '' || /(?:^|\s)void$/.test(returnType)) return issues
    const documented = docContents.some((content) => /^@return\b/.test(content.trim()))
        || docContents.some((content) => /^@retval\s+/.test(content.trim()))
    if (!documented && options.requireReturn !== false) {
        issues.push({ rule: 'return-missing', message: '非 void 函数缺少 @return（或用 @retval 逐值说明）：写清返回值怎么读、失败时返回什么' })
    }
    return issues
}

/** 检查 @retval 组的顺序：成功项在最前，且只出现一次。 */
function retvalOrderIssues(docContents) {
    const rows = docContents
        .map((content) => /^@retval\s+(\S+)\s*(.*)$/.exec(content.trim()))
        .filter(Boolean)
    const issues = []
    if (rows.length === 0) return issues
    const successIndex = rows.findIndex((row) => row[2].trim().startsWith('成功：'))
    if (successIndex === -1) return issues
    if (successIndex !== 0) {
        issues.push({ rule: 'retval-order', message: '第一个 @retval 要写成功项，说明以「成功：」开头' })
    }
    for (const [index, row] of rows.entries()) {
        if (index !== successIndex && row[2].includes('成功：')) {
            issues.push({ rule: 'retval-order', message: `@retval ${row[1]} 又写了「成功：」：成功项只保留在最前面的一个 @retval` })
        }
    }
    return issues
}

/** 检查一段文本，返回问题列表；每个问题带 1 起始的行号。 */
export function checkText(text, options = {}) {
    const width = options.width ?? 120
    const requireHeader = options.requireHeader ?? true
    const lines = text.split(/\r?\n/)
    const issues = []
    const add = (line, rule, message) => issues.push({ line, rule, message })
    const inClass = classMemberLines(lines)
    const inStruct = classMemberLines(lines, 'struct')

    const style = options.commentStyle === 'block' ? 'block' : 'slash'
    const firstContent = lines.findIndex((line) => line.trim() !== '')
    const firstTrimmed = firstContent === -1 ? '' : lines[firstContent].trim()
    const headerBlock = style === 'block' && firstContent !== -1 ? blockDocAt(lines, firstContent) : undefined
    const hasDoxyHeader = style === 'block'
        ? Boolean(headerBlock && BLOCK_FILE.test(headerBlock.contents[0] ?? ''))
        : DOXY_FILE.test(firstTrimmed)
    let doxyHeaderEnd = -1
    if (hasDoxyHeader && style === 'block') {
        doxyHeaderEnd = headerBlock.end
    } else if (hasDoxyHeader) {
        doxyHeaderEnd = firstContent
        while (doxyHeaderEnd + 1 < lines.length && lines[doxyHeaderEnd + 1].trim().startsWith('///')) doxyHeaderEnd += 1
    }
    if (requireHeader && firstContent !== -1 && !hasDoxyHeader) {
        if (style === 'block') add(firstContent + 1, 'header-missing', '文件开头缺少文件头：写 /** ... */，第一行 @file <文件名>，随后写 @brief')
        else add(firstContent + 1, 'header-missing', '文件开头缺少文件头：写 /// @file <文件名>，随后写 /// @brief')
    }
    if (firstContent !== -1 && hasDoxyHeader) {
        const own = options.fileName ? options.fileName.split(/[\\/]/).pop() : ''
        const declaredText = style === 'block' ? (headerBlock.contents[0] ?? '') : lines[firstContent].trim()
        if (own) {
            const declared = /@file\s+(\S+)/.exec(declaredText)
            if (declared && declared[1] !== own) {
                add(firstContent + 1, 'header-file-name', `文件头写的是 ${declared[1]}，本文件是 ${own}：@file 必须等于文件名`)
            }
        }
        if (options.requireBrief !== false) {
            const slashBrief = (lines[firstContent + 1] ?? '').trim()
            const slashGap = /^\/\/\/\s*$/.test(slashBrief)
            const blockBrief = headerBlock?.contents[1] ?? ''
            const blockGap = style === 'block' && blockBrief.trim() === ''
            const hasBrief = style === 'block'
                ? BLOCK_BRIEF.test(blockBrief) || (blockGap && BLOCK_BRIEF.test(headerBlock?.contents[2] ?? ''))
                : DOXY_BRIEF.test(slashBrief) || (slashGap && DOXY_BRIEF.test((lines[firstContent + 2] ?? '').trim()))
            if (!hasBrief) {
                add(style === 'block' ? headerBlock.start + 3 : firstContent + 2, 'header-brief', '文件头在 @file 之后缺少 @brief 一句话说明')
            }
        }
        const headerLines = style === 'block'
            ? headerBlock.contents.slice(1).map((content, offset) => ({ line: headerBlock.start + offset + 2, text: content }))
            : lines.slice(firstContent + 1, doxyHeaderEnd + 1).map((content, offset) => ({ line: firstContent + offset + 2, text: content.trim() }))
        for (const { line: headerLine, text } of headerLines) {
            const names = text.match(/\b[A-Za-z0-9_-]+\.(?:h|hpp|cpp|cc)\b/g) ?? []
            const fileMatches = text.match(/@file\s+(\S+)/)
            const namesToCheck = fileMatches ? names.filter((name) => name !== fileMatches[1]) : names
            for (const name of namesToCheck) {
                if (name !== own) add(headerLine, 'header-cross-file', `文件头提到了别的源文件 ${name}：只介绍本文件，删掉跨文件句子`)
            }
            if (/\b(?:app|src|include|tests)\//.test(text)) add(headerLine, 'header-cross-file', '文件头指向了另一个目录：只介绍本文件')
        }
    }

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]
        const trimmed = line.trim()
        if (trimmed.startsWith('///') || (trimmed.startsWith('//') && !trimmed.startsWith('//!'))) {
            const measured = line.replace(/\s+$/, '')
            if (displayWidth(measured) > width) add(index + 1, 'comment-width', `注释行 ${displayWidth(measured)} 列，超过 ${width} 列`)
            if (/^\/\/\/ {0,2}- /.test(trimmed)) {
                add(index + 1, 'list-indent', '注释列表项要在 /// 后空三格再写 -：`///   - `，与总起句拉开层级')
            }
            for (const tag of FORBIDDEN_TAGS) {
                if (PRIVACY_TAGS.includes(tag) && options.allowTags?.has(tag.slice(1))) continue
                if (trimmed.includes(tag)) add(index + 1, 'forbidden-tag', `禁止使用 ${tag}，按 references/comments/01-comment-rules.md 的标签表改写`)
            }
        }
    }

    if (style === 'block') {
        for (let index = 0; index < lines.length; index += 1) {
            const doc = blockDocAt(lines, index)
            if (!doc) continue
            for (let raw = doc.start; raw <= doc.end; raw += 1) {
                const measured = lines[raw].replace(/\s+$/, '')
                if (displayWidth(measured) > width) add(raw + 1, 'comment-width', `注释行 ${displayWidth(measured)} 列，超过 ${width} 列`)
            }
            for (const content of doc.contents) {
                for (const tag of FORBIDDEN_TAGS) {
                    if (PRIVACY_TAGS.includes(tag) && options.allowTags?.has(tag.slice(1))) continue
                    if (content.includes(tag)) add(doc.start + 1, 'forbidden-tag', `禁止使用 ${tag}，按 references/comments/01-comment-rules.md 的标签表改写`)
                }
            }
            for (let raw = doc.start; raw <= doc.end; raw += 1) {
                if (/^\s*\* {0,2}- /.test(lines[raw])) {
                    add(raw + 1, 'list-indent', '块注释列表项要在 * 后空三格再写 -：` *   - `，与总起句拉开层级')
                }
            }
            if (!doc.contents.some((content) => content.includes('@file')) && hasBriefTagGap(doc.contents)) {
                add(doc.start + 1, 'brief-tag-gap', '摘要或详细描述与标签块之间要空一行：在首个标签前补一行 `///`')
            }
            if (!doc.contents.some((content) => content.includes('@file')) && hasTagGap(doc.contents)) {
                add(doc.start + 1, 'tag-gap', '同一分组内的 Doxygen 标签之间有空行：参数、返回值、异常、说明各成一组，组间空一行，组内连续')
            }
            index = doc.end
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
        const declaration = joinedDeclaration(lines, next)
        const block = lines.slice(start, end + 1).join('\n')
        const docContents = lines.slice(start, end + 1).map((line) => line.trim().replace(/^\/\/\/\s?/, ''))
        if (hasBriefTagGap(docContents)) {
            add(start + 1, 'brief-tag-gap', '摘要或详细描述与标签块之间要空一行：在首个标签前补一行 `///`')
        }
        if (hasTagGap(docContents)) {
            add(start + 1, 'tag-gap', '同一分组内的 Doxygen 标签之间有空行：参数、返回值、异常、说明各成一组，组间空一行，组内连续')
        }
        for (const issue of retvalOrderIssues(docContents)) add(start + 1, issue.rule, issue.message)
        const isType = /^(template\s*<[^>]*>\s*)?(class|struct|union|enum)\b/.test(declaration)
        if (!isType) {
            for (const issue of functionDocIssues(declaration, docContents, options)) add(start + 1, issue.rule, issue.message)
        }
        if (!isType && CALLER_LIST.test(block) && MEMBER_REF.test(block)) {
            add(start + 1, 'caller-list', '函数注释在点名调用者：调用关系会随重构过期，只写这个函数做什么、参数、返回值与异常')
        }
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
        if (NEGATIVE_SCOPE.test(block)) {
            add(start + 1, 'negative-scope', '注释用「不检查/不校验/不负责/不判断」写能力边界：改成正向限定，前置条件写「调用方保证…」或 @pre')
        }
        if (isType && DOMAIN_SIZE.test(block)) {
            add(start + 1, 'domain-size', '类型注释在写领域尺寸：格子数由 squares_ 之类成员声明表达，删掉这句')
        }
        const firstDocLine = lines[start].trim().replace(/^\/\/\/\s*/, '')
        if (!isType && PREDICATE_DECL.test(declaration) && !isPredicateFirstOk(declaration, firstDocLine)) {
            add(start + 1, 'predicate-first', '布尔查询的第一句应写「…是否…」，句首不用「检查/判断/校验/验证」；operator== 写「相等运算符」')
        }
        if (options.requireParam !== false) {
            const params = functionParams(declaration)
            if (!params) continue
            const summary = summaryParagraph(docContents)
            const named = params.filter((name) => mentionsParam(summary, name))
            if (named.length > 0) {
                add(start + 1, 'param-in-summary', `函数摘要直接写了参数名 ${named.join('、')}：改用「指定坐标」「传入的值」这类语义名词，参数名只放在 @param 行`)
            }
            const documented = [...block.matchAll(/@param(?:\[[^\]]*\])?\s+(\w+)/g)].map((match) => match[1])
            for (const name of params) {
                if (!documented.includes(name)) add(start + 1, 'param-missing', `参数 ${name} 没有 @param 说明`)
            }
            for (const name of documented) {
                if (!params.includes(name)) add(start + 1, 'param-extra', `@param ${name} 在声明里不存在`)
            }
        }
    }

    if (style === 'block') {
        for (let index = 0; index < lines.length; index += 1) {
            if (doxyHeaderEnd !== -1 && index <= doxyHeaderEnd) {
                index = doxyHeaderEnd
                continue
            }
            const doc = blockDocAt(lines, index)
            if (!doc) continue
            index = doc.end
            let next = doc.end + 1
            if (next < lines.length && lines[next].trim() === '') {
                add(doc.end + 1, 'doc-gap', '注释与声明之间有空行：注释会挂到下一个声明，请删掉空行')
                while (next < lines.length && lines[next].trim() === '') next += 1
            }
            if (next >= lines.length) continue
            const declaration = joinedDeclaration(lines, next)
            const block = doc.contents.join('\n')
            for (const issue of retvalOrderIssues(doc.contents)) add(doc.start + 1, issue.rule, issue.message)
            const isType = /^(template\s*<[^>]*>\s*)?(class|struct|union|enum)\b/.test(declaration)
            if (!isType) {
                for (const issue of functionDocIssues(declaration, doc.contents, options)) add(doc.start + 1, issue.rule, issue.message)
            }
            if (!isType && CALLER_LIST.test(block) && MEMBER_REF.test(block)) {
                add(doc.start + 1, 'caller-list', '函数注释在点名调用者：调用关系会随重构过期，只写这个函数做什么、参数、返回值与异常')
            }
            if (RATIONALE.test(block)) add(doc.start + 1, 'rationale', '注释在写设计取舍：方案对比与理由移到正文或实现注释，接口注释只留契约')
            if (isType && MEMBER_LIST.test(block)) add(doc.start + 1, 'member-list', '类型注释在罗列成员功能，应改写为概念与使用约定')
            if (isType && FORWARD_REF.test(block)) add(doc.start + 1, 'forward-ref', '类型注释在交代别的类型负责什么：只写本类型的契约，删掉这句，不要挪到文件头')
            if (isType && TYPE_SYSTEM.test(block)) add(doc.start + 1, 'type-system', '类型注释在复述类型系统已表达的性质：可拷贝与 const 查询由声明给出，删掉这句')
            if (isType && NEGATED_BOUNDARY.test(block)) add(doc.start + 1, 'negated-boundary', '类型注释用「只保存/不拥有/不含」写否定式边界：改成名词短语，边界交给成员类型表达')
            if (NEGATIVE_SCOPE.test(block)) add(doc.start + 1, 'negative-scope', '注释用「不检查/不校验/不负责/不判断」写能力边界：改成正向限定，前置条件写「调用方保证…」或 @pre')
            if (isType && DOMAIN_SIZE.test(block)) add(doc.start + 1, 'domain-size', '类型注释在写领域尺寸：格子数由 squares_ 之类成员声明表达，删掉这句')
            const firstDocLine = doc.contents[0] ?? ''
            if (!isType && PREDICATE_DECL.test(declaration) && !isPredicateFirstOk(declaration, firstDocLine)) {
                add(doc.start + 1, 'predicate-first', '布尔查询的第一句应写「…是否…」，句首不用「检查/判断/校验/验证」；operator== 写「相等运算符」')
            }
            if (options.requireParam !== false) {
                const params = functionParams(declaration)
                if (!params) continue
                const summary = summaryParagraph(doc.contents)
                const named = params.filter((name) => mentionsParam(summary, name))
                if (named.length > 0) {
                    add(doc.start + 1, 'param-in-summary', `函数摘要直接写了参数名 ${named.join('、')}：改用「指定坐标」「传入的值」这类语义名词，参数名只放在 @param 行`)
                }
                const documented = [...block.matchAll(/@param(?:\[[^\]]*\])?\s+(\w+)/g)].map((match) => match[1])
                for (const name of params) {
                    if (!documented.includes(name)) add(doc.start + 1, 'param-missing', `参数 ${name} 没有 @param 说明`)
                }
                for (const name of documented) {
                    if (!params.includes(name)) add(doc.start + 1, 'param-extra', `@param ${name} 在声明里不存在`)
                }
            }
        }
    }

    for (let index = 0; index < lines.length; index += 1) {
        if (doxyHeaderEnd !== -1 && index <= doxyHeaderEnd) continue
        if (/^\s/.test(lines[index])) continue
        const name = escapedControlConstant(lines[index])
        if (!name) continue
        const doc = attachedDoc(lines, index, style)
        if (!doc) {
            add(index + 1, 'constant-comment-missing', `控制序列常量 ${name} 缺少注释：在声明上一行写「……的控制序列：……。」`)
            continue
        }
        const summary = summaryParagraph(doc.contents)
        const firstSentence = summary.match(/[^。]*。/)?.[0] ?? summary
        if (!SEQUENCE_FIRST.test(firstSentence)) {
            add(doc.start + 1, 'constant-sequence-first', `控制序列常量 ${name} 的第一句要写成名词短语「……的控制序列：……。」：先说是哪个序列，再写名字和转义写法看不出的事实`)
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
            if (line.slice(commentAt).startsWith('///<')) {
                if (inStruct[index]) continue
                add(index + 1, 'member-comment-trailing', `数据成员 ${member} 只用行尾 ///< 注释：///< 只留给枚举项和 struct 的短字段，类数据成员的主注释写在声明上一行`)
                continue
            }
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
        const marker = lines[index].indexOf('///<')
        if (marker === -1) continue
        const content = lines[index].slice(marker + 4).trim()
        if (content.endsWith('。')) {
            add(index + 1, 'enum-trailing-period', '行尾短句不收句号：删掉 ///< 说明末尾的「。」')
        }
    }

    for (let index = 0; index < lines.length; index += 1) {
        const marker = lines[index].indexOf('///<')
        if (marker === -1) continue
        const content = lines[index].slice(marker + 4).trim().replace(/。$/, '').trim()
        const colon = content.indexOf('：')
        if (colon !== -1 && content.slice(colon + 1).trim() === '') {
            add(index + 1, 'enum-trailing-empty', '行尾注释冒号后为空：写「类别：说明」，冒号两侧都不能为空')
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
    if (options.help) return help()
    const root = options.root ? path.resolve(options.root) : process.cwd()
    try {
        statSync(root)
    } catch {
        return usage(`根目录不存在或无法读取：${root}`)
    }
    const columnLimit = readColumnLimit(root)
    if (columnLimit !== undefined) {
        if (!options.widthExplicit) options.width = columnLimit
    }
    let files
    try {
        files = collectFiles(root)
    } catch (error) {
        return usage(`读取 ${root} 失败：${error.message}`)
    }
    const results = []
    const texts = new Map()
    for (const file of files) {
        let text
        try {
            text = readFileSync(file, 'utf8')
        } catch (error) {
            process.stderr.write(`错误：读取 ${file} 失败：${error.message}\n`)
            return EXIT.usage
        }
        texts.set(file, text)
        const width = options.widthExplicit
            ? options.width
            : (readColumnLimitNear(file, root) ?? options.width)
        for (const issue of checkText(text, { ...options, width, fileName: path.relative(root, file) || file })) {
            results.push({ file: path.relative(root, file) || file, ...issue })
        }
    }
    const headerNames = new Set()
    for (const file of files) {
        if (HEADER_EXT.has(path.extname(file).toLowerCase())) {
            for (const name of declarationNames(texts.get(file))) headerNames.add(name)
        }
    }
    for (const file of files) {
        if (!CPP_EXT.has(path.extname(file).toLowerCase())) continue
        for (const issue of checkDefinitionDocs(texts.get(file), headerNames, options)) {
            results.push({ file: path.relative(root, file) || file, ...issue })
        }
    }
    results.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line)
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
