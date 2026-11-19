#!/usr/bin/env node
// Git 工作树的只读编码审计。
//
// 默认 profile "portable" 是跨平台基线：UTF-8 无 BOM、LF 换行、末尾一个换行。
// profile "msvc" 只对 MSVC 编译的 C/C++ 源放宽为允许 UTF-8 BOM 与 CRLF；
// Markdown、CMake、脚本与配置仍按 portable 检查。从不改写文件。
//
// 检查前按文件的真实路径读取逐级 .gitattributes（text / binary / eol /
// working-tree-encoding）与逐级向上的 .editorconfig（charset / end_of_line /
// insert_final_newline），两者都没有声明时才用上面的默认组合。
//
// 用法：
//   node checking-encoding.mjs [--root DIR] [--profile portable|msvc] [--json] [--quiet]
//
// 退出码：0 干净，1 发现问题，2 用法或 Git 错误。
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
// .editorconfig 里不是 UTF-8 的 charset：工作树编码由别的工具负责，本脚本不判。
const NON_UTF8_CHARSETS = new Set(['latin1', 'utf-16be', 'utf-16le'])
const EOL_VALUES = new Set(['lf', 'crlf', 'cr'])

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

function readText(file) {
    try {
        return readFileSync(file, 'utf8')
    } catch {
        return undefined
    }
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 把 .gitattributes / .editorconfig 的 glob 片段翻成正则源码。
// * 与 ? 不跨目录，** 跨目录，[...] 是字符类，反斜杠转义下一个字符。
function globSource(pattern) {
    let source = ''
    for (let index = 0; index < pattern.length; index += 1) {
        const char = pattern[index]
        if (char === '\\' && index + 1 < pattern.length) {
            index += 1
            source += escapeRegExp(pattern[index])
        } else if (char === '*') {
            if (pattern[index + 1] === '*') {
                index += 1
                if (pattern[index + 1] === '/') {
                    index += 1
                    source += '(?:.*/)?'
                } else {
                    source += '.*'
                }
            } else {
                source += '[^/]*'
            }
        } else if (char === '?') {
            source += '[^/]'
        } else if (char === '[') {
            let close = index + 1
            if (pattern[close] === '!' || pattern[close] === '^') close += 1
            if (pattern[close] === ']') close += 1
            while (close < pattern.length && pattern[close] !== ']') close += 1
            if (close >= pattern.length) {
                source += '\\['
            } else {
                let body = pattern.slice(index + 1, close)
                if (body.startsWith('!')) body = `^${body.slice(1)}`
                source += `[${body.replace(/\\/g, '\\\\')}]`
                index = close
            }
        } else {
            source += escapeRegExp(char)
        }
    }
    return source
}

function splitBraces(body) {
    const parts = []
    let depth = 0
    let start = 0
    for (let index = 0; index < body.length; index += 1) {
        const char = body[index]
        if (char === '{') depth += 1
        else if (char === '}') depth -= 1
        else if (char === ',' && depth === 0) {
            parts.push(body.slice(start, index))
            start = index + 1
        }
    }
    parts.push(body.slice(start))
    return parts
}

// EditorConfig 的 {a,b} 写法；展开后每条再翻正则。
function expandBraces(pattern) {
    const open = pattern.indexOf('{')
    if (open === -1) return [pattern]
    let depth = 0
    let close = -1
    for (let index = open; index < pattern.length; index += 1) {
        if (pattern[index] === '{') depth += 1
        else if (pattern[index] === '}') {
            depth -= 1
            if (depth === 0) {
                close = index
                break
            }
        }
    }
    if (close === -1) return [pattern]
    const before = pattern.slice(0, open)
    const after = pattern.slice(close + 1)
    const expanded = []
    for (const part of splitBraces(pattern.slice(open + 1, close))) {
        expanded.push(...expandBraces(before + part + after))
    }
    return expanded
}

function compilePattern(pattern) {
    const anchored = pattern.includes('/')
    const body = pattern.startsWith('/') ? pattern.slice(1) : pattern
    return { anchored, regex: new RegExp(`^${globSource(body)}$`) }
}

function compilePatterns(pattern) {
    return expandBraces(pattern).map(compilePattern)
}

function matchesAny(compiled, relativePath) {
    const name = path.posix.basename(relativePath)
    return compiled.some((item) => item.regex.test(item.anchored ? relativePath : name))
}

function parseAttributes(text) {
    const rules = []
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#') || line.startsWith('[attr]')) continue
        const [pattern, ...pairs] = line.split(/\s+/)
        if (!pattern || pattern.startsWith('!')) continue
        const attributes = new Map()
        for (const pair of pairs) {
            if (pair.startsWith('-')) {
                attributes.set(pair.slice(1).toLowerCase(), 'false')
            } else {
                const equals = pair.indexOf('=')
                if (equals === -1) {
                    attributes.set(pair.toLowerCase(), 'true')
                } else {
                    attributes.set(pair.slice(0, equals).toLowerCase(), pair.slice(equals + 1).toLowerCase())
                }
            }
        }
        if (attributes.has('binary')) attributes.set('text', 'false')
        rules.push({ pattern, compiled: compilePatterns(pattern), attributes })
    }
    return rules
}

// 逐级读取 .gitattributes：根目录先应用，子目录的规则后覆盖。
function attributesFor(root, relative, cache) {
    const directories = []
    let directory = path.posix.dirname(relative)
    while (true) {
        directories.push(directory === '.' ? '' : directory)
        if (directory === '.' || directory === '') break
        directory = path.posix.dirname(directory)
    }
    directories.reverse()

    const result = new Map()
    for (const prefix of directories) {
        const file = path.join(root, prefix, '.gitattributes')
        let rules = cache.get(file)
        if (rules === undefined) {
            const text = readText(file)
            rules = text === undefined ? [] : parseAttributes(text)
            cache.set(file, rules)
        }
        const within = relative.slice(prefix ? prefix.length + 1 : 0)
        for (const rule of rules) {
            if (!matchesAny(rule.compiled, within)) continue
            for (const [name, value] of rule.attributes) result.set(name, value)
        }
    }
    return result
}

function parseEditorConfig(text) {
    const sections = []
    let root = false
    let current
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#') || line.startsWith(';')) continue
        if (line.startsWith('[') && line.endsWith(']')) {
            current = { compiled: compilePatterns(line.slice(1, -1)), properties: new Map() }
            sections.push(current)
            continue
        }
        const equals = line.indexOf('=')
        if (equals === -1) continue
        const key = line.slice(0, equals).trim().toLowerCase()
        const value = line.slice(equals + 1).trim().toLowerCase()
        if (!current) {
            if (key === 'root' && value === 'true') root = true
            continue
        }
        current.properties.set(key, value)
    }
    return { root, sections }
}

// 从文件所在目录向上找 .editorconfig，遇到 root = true 停止；
// 远的先应用，近的后覆盖，同一文件内后面的节覆盖前面的节。
function editorConfigFor(root, relative, cache) {
    const chain = []
    let directory = path.posix.dirname(relative)
    while (true) {
        const prefix = directory === '.' ? '' : directory
        const file = path.join(root, prefix, '.editorconfig')
        let config = cache.get(file)
        if (config === undefined) {
            const text = readText(file)
            config = text === undefined ? null : parseEditorConfig(text)
            cache.set(file, config)
        }
        if (config) {
            chain.push({ prefix, config })
            if (config.root) break
        }
        if (directory === '.' || directory === '') break
        directory = path.posix.dirname(directory)
    }
    chain.reverse()

    const properties = new Map()
    for (const { prefix, config } of chain) {
        const within = relative.slice(prefix ? prefix.length + 1 : 0)
        for (const section of config.sections) {
            if (!matchesAny(section.compiled, within)) continue
            for (const [key, value] of section.properties) properties.set(key, value)
        }
    }
    return properties
}

function configuredLineEnding(editor, attributes) {
    const editorEol = editor.get('end_of_line')
    if (EOL_VALUES.has(editorEol)) return editorEol
    const attributeEol = attributes.get('eol')
    if (EOL_VALUES.has(attributeEol)) return attributeEol
    return undefined
}

function inspect(file, root, profile, caches) {
    const rel = path.relative(root, file).split(path.sep).join('/')
    const base = path.basename(file).toLowerCase()
    const extension = base.startsWith('.') ? base : path.extname(file).toLowerCase()
    const source = MSVC_SOURCE.has(extension)
    const alwaysLf = ALWAYS_LF.has(extension) || NO_EXTENSION_LF.has(path.basename(file))
    const issues = []
    const add = (kind, message) => issues.push({ path: rel, kind, message })

    const attributes = attributesFor(root, rel, caches.gitAttributes)
    const editor = editorConfigFor(root, rel, caches.editorConfig)

    let buffer
    try {
        buffer = readFileSync(file)
    } catch (error) {
        add('read', `无法读取（${error.message}）`)
        return { rel, issues }
    }

    if (attributes.get('binary') === 'true' || attributes.get('text') === 'false') {
        return { rel, issues }
    }

    const charset = editor.get('charset') ?? 'utf-8'
    const workingTreeEncoding = attributes.get('working-tree-encoding')
    const transcoded = workingTreeEncoding !== undefined && !/^utf-?8$/i.test(workingTreeEncoding)
    if (transcoded || NON_UTF8_CHARSETS.has(charset)) {
        return { rel, issues }
    }

    const bom = bomOf(buffer)
    const bomAllowed = charset === 'utf-8-bom' || (profile === 'msvc' && source)
    if (bom === 'UTF-8') {
        if (!bomAllowed) {
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

    if (buffer.length > 0 && !body.endsWith('\n') && editor.get('insert_final_newline') !== 'false') {
        add('newline', '缺少末尾换行')
    }

    const crlf = (body.match(/\r\n/g) ?? []).length
    const lf = (body.match(/(?<!\r)\n/g) ?? []).length
    const cr = (body.match(/\r(?!\n)/g) ?? []).length

    const expected = configuredLineEnding(editor, attributes)
    if (expected === 'crlf') {
        if (crlf === 0 || lf > 0 || cr > 0) add('eol', '应为 CRLF')
    } else if (expected === 'cr') {
        if (cr === 0 || lf > 0 || crlf > 0) add('eol', '应为 CR')
    } else if (expected === 'lf') {
        if (crlf > 0 || cr > 0) add('eol', '应为 LF')
    } else if (profile === 'msvc' && source && !alwaysLf) {
        if ((crlf > 0 && lf > 0) || cr > 0) add('eol', '不要混用 CRLF 与 LF')
    } else if (CRLF_REQUIRED.has(extension)) {
        if (crlf === 0 || lf > 0 || cr > 0) add('eol', '应为 CRLF')
    } else if (crlf > 0 || cr > 0) {
        add('eol', '应为 LF')
    }

    return { rel, issues }
}

export function checkEncoding(root, profile = 'portable') {
    const files = listFiles(root)
    const caches = { gitAttributes: new Map(), editorConfig: new Map() }
    const results = []
    for (const file of files) {
        results.push(inspect(file, root, profile, caches))
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
