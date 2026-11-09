#!/usr/bin/env node
// 打包后的 C++ 工作流技能的结构检查。
//
// 这里守住最容易随手改坏的部分：包元数据、单行 bundle patch、三份技能布局、
// 步骤编号、本地链接、空工程模板、构建资产与 README/docs 表面。
// 检查不联网，也不需要 C++ 编译器。

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isPackagedPath } from './skill-link-rules.mjs'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const failures = []
let checks = 0

function ok(condition, message) {
  if (condition) {
    checks += 1
    return true
  }
  failures.push(message)
  return false
}

function equal(actual, expected, message) {
  return ok(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`)
}

function read(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8')
}

function readJson(relPath) {
  try {
    return JSON.parse(read(relPath))
  } catch (error) {
    failures.push(`${relPath}: JSON 解析失败（${error.message}）`)
    return undefined
  }
}

function listFiles(absDir, out = []) {
  for (const entry of readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name === '.git')) continue
    const abs = join(absDir, entry.name)
    if (entry.isDirectory()) listFiles(abs, out)
    else if (entry.isFile()) out.push(abs)
  }
  return out
}

function rel(absPath) {
  return relative(ROOT, absPath).split(sep).join('/')
}

function withoutFences(text) {
  let fenced = false
  return text
    .split(/\r?\n/)
    .filter((line) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced
        return false
      }
      return !fenced
    })
    .join('\n')
}

function h1(text) {
  const match = /^#\s+(.+)$/m.exec(withoutFences(text))
  return match ? match[1].trim() : undefined
}

function h2s(text) {
  return [...withoutFences(text).matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim())
}

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) return undefined
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line)
    if (pair) data[pair[1]] = pair[2].trim()
  }
  return { data, body: text.slice(match[0].length) }
}

function checkMarkdownLinks(files) {
  for (const abs of files) {
    const text = withoutFences(read(rel(abs))).replace(/`[^`]*`/g, '')
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim().replace(/^<|>$/g, '').split(/\s+/)[0]
      if (!target || target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue
      target = target.split('#')[0]
      if (!target) continue
      let decoded
      try {
        decoded = decodeURIComponent(target)
      } catch {
        failures.push(`${rel(abs)}: 链接转义无效 ${target}`)
        continue
      }
      const resolved = resolve(dirname(abs), decoded)
      if (resolved !== ROOT && !resolved.startsWith(ROOT + sep)) {
        failures.push(`${rel(abs)}: 链接指出仓库 ${target}`)
        continue
      }
      const exists = existsSync(resolved)
      ok(exists, `${rel(abs)}: 链接指向不存在的 ${target}`)
      if (exists && isPackagedPath(rel(abs), packageJson?.files ?? [])) {
        ok(
          isPackagedPath(rel(resolved), packageJson?.files ?? []),
          `${rel(abs)}: 链接目标不随 npm 包发布 ${target}`,
        )
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 包元数据
// ---------------------------------------------------------------------------

const packageJson = readJson('package.json')
if (packageJson) {
  equal(packageJson.name, '@chengzhao-dev/dsh-cpp-workflow', '包名')
  ok(/^\d+\.\d+\.\d+$/.test(packageJson.version), '版本必须是 x.y.z')
  equal(packageJson.type, 'module', 'type')
  equal(packageJson.main, './lib/index.js', 'main')
  equal(packageJson.license, 'MIT', 'license')

  equal(
    packageJson.files,
    ['lib', 'skills', 'cordis.patch.yml', 'locale', 'icon.svg', 'README.md', 'README.en.md', 'LICENSE', 'templates'],
    'files 白名单',
  )
  for (const name of ['src', 'tests', 'scripts', 'docs', '.github']) {
    ok(!packageJson.files.includes(name), `files 不应包含 ${name}`)
  }

  const description = packageJson.description ?? ''
  ok(/[\u4e00-\u9fff]/.test(description), 'description 必须以中文为主')
  if (description.includes(' · ')) {
    const descriptionParts = description.split(' · ')
    ok(descriptionParts.length === 2, 'description 用「 · 」分隔时只能分两段')
    ok(!/[\u4e00-\u9fff]/.test(descriptionParts[1] ?? ''), 'description 后半段不应含中文')
  }

  equal(packageJson.engines?.node, '>=22', 'engines.node')
  equal(packageJson.engines?.dsh, '>=0.2.1-rc.1 <0.3.0-0', 'engines.dsh')
  equal(packageJson.peerDependencies?.['@deepseek-ai/dsh-skill'], '>=0.2.1-rc.1 <0.3.0-0', 'peer 范围')
  equal(packageJson.devDependencies?.['@deepseek-ai/dsh-skill'], '>=0.2.1-rc.1 <0.3.0-0', 'dev 范围')
  ok(Boolean(packageJson.devDependencies?.typescript), '缺少 TypeScript devDependency')

  equal(packageJson.publishConfig?.access, 'public', 'publishConfig.access')
  ok(!existsSync(join(ROOT, '.npmignore')), '不应保留与 files 白名单重复的 .npmignore')
  equal(packageJson.publishConfig?.provenance, true, 'publishConfig.provenance')
  ok(packageJson.repository?.url?.includes('github.com/chengzhao-dev/dsh-cpp-workflow'), 'repository 指向 GitHub')
  ok(
    String(packageJson.scripts?.build ?? '').includes('tsc -p tsconfig.json') &&
      String(packageJson.scripts?.build ?? '').includes('scripts/building-client.mjs'),
    'build 脚本必须编译服务端并生成客户端半侧',
  )
  equal(packageJson.scripts?.prepare, undefined, '不应有 prepare 安装脚本')
  for (const token of ['npm run build', 'checking-skill-links.mjs', 'node --test tests/*.test.mjs']) {
    ok(packageJson.scripts?.test?.includes(token), `npm test 缺少 ${token}`)
  }
  equal(packageJson.scripts?.check, undefined, '不应保留与 npm test 重复的 check 脚本')

  equal(packageJson.dsh?.bundle?.patch, './cordis.patch.yml', 'dsh.bundle.patch')
  equal(packageJson.dsh?.catalog?.category, 'skill', 'dsh.catalog.category')
  equal(packageJson.dsh?.catalog?.capabilities, ['skills'], 'dsh.catalog.capabilities')
  ok(Boolean(packageJson.dsh?.catalog?.summary?.zh), 'dsh.catalog.summary.zh 为空')
  ok(Boolean(packageJson.dsh?.catalog?.summary?.en), 'dsh.catalog.summary.en 为空')
  // 0.6.0 起本包带客户端半侧：只注册插件页配置卡片，挂在包名那一行。
  if ('client' in (packageJson.dsh ?? {})) {
    equal(packageJson.dsh.client?.platform, 'web', 'dsh.client.platform')
    ok(
      (packageJson.dsh.client?.inject ?? []).includes('@deepseek-ai/dsh-client-ui-renderer'),
      'dsh.client.inject 缺少提供 slots 服务的 ui-renderer',
    )
    equal(packageJson.exports?.['./client'], './lib/client.js', 'exports["./client"]')
  } else {
    ok(false, '0.6.0 起必须声明 dsh.client（插件页配置卡片）')
  }

  equal(packageJson.exports?.['.'], './lib/index.js', 'exports["."]')
  equal(packageJson.exports?.['./cordis.patch.yml'], './cordis.patch.yml', 'exports patch')
  equal(packageJson.icon, './icon.svg', 'icon 字段')
}

// package-lock 与带作用域的包名保持同步。
const packageLock = readJson('package-lock.json')
if (packageLock && packageJson) {
  equal(packageLock.name, '@chengzhao-dev/dsh-cpp-workflow', 'package-lock.name')
  equal(packageLock.version, packageJson.version, 'package-lock.version')
  equal(packageLock.packages?.['']?.name, '@chengzhao-dev/dsh-cpp-workflow', 'package-lock 根包名')
  equal(packageLock.packages?.['']?.version, packageJson.version, 'package-lock 根包版本')
}

// ---------------------------------------------------------------------------
// Bundle patch、locale 与图标
// ---------------------------------------------------------------------------

const patch = read('cordis.patch.yml')
ok((patch.match(/^- insert:/gm) ?? []).length === 1, '补丁必须只有一行顶层 insert')
ok(/^\s*- id: cpp-workflow\s*$/m.test(patch), '补丁缺少 id: cpp-workflow')
ok(
  /^\s*name: "@chengzhao-dev\/dsh-cpp-workflow"\s*$/m.test(patch),
  '补丁 name 必须逐字等于包名',
)
ok(!/^-\s*(replace|remove|disable):/m.test(patch), '补丁只允许 insert，不应有 replace/remove/disable')

for (const locale of ['zh', 'en']) {
  const data = readJson(`locale/${locale}.json`)
  if (!data) continue
  equal(Object.keys(data), ['meta'], `locale/${locale}.json 顶层键`)
  equal(Object.keys(data.meta ?? {}), ['title', 'description'], `locale/${locale}.json meta 键`)
  ok(typeof data.meta?.title === 'string' && data.meta.title.trim(), `locale/${locale}.json 缺少 title`)
  ok(
    typeof data.meta?.description === 'string' && data.meta.description.trim(),
    `locale/${locale}.json 缺少 description`,
  )
}

const iconPath = join(ROOT, 'icon.svg')
if (ok(existsSync(iconPath), '缺少 icon.svg')) {
  const size = statSync(iconPath).size
  ok(size < 256 * 1024, `icon.svg 超过 256 KiB（${size}）`)
  const icon = readFileSync(iconPath, 'utf8')
  ok(/<svg[\s>]/i.test(icon), 'icon.svg 不是自包含 SVG')
  ok(!/<script[\s>]/i.test(icon), 'icon.svg 不应含脚本')
  ok(!/(?:xlink:)?href\s*=\s*["']https?:/i.test(icon), 'icon.svg 不应引用外部资源')
  ok(!/url\(\s*["']?https?:/i.test(icon), 'icon.svg 不应引用外部资源')
}

// ---------------------------------------------------------------------------
// 三份技能与步骤
// ---------------------------------------------------------------------------

const skillsRoot = join(ROOT, 'skills')
const skillDirs = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
equal(skillDirs.filter((name) => name !== 'shared'), ['building-cpp', 'developing-cpp', 'engineering'], '技能目录')
equal(skillDirs.includes('shared'), true, 'skills/shared 目录')

const SKILL_SPECS = {
  'developing-cpp': {
    title: 'developing-cpp',
    steps: ['01-behavior.md', '02-boundary.md', '03-declaration.md', '04-implementation.md'],
    sections: ['references'],
    h2: ['适用场景', '三种操作', '步骤', '入口表', '加载预算', '四类改动', '完成判据'],
  },
  'engineering': {
    title: 'engineering',
    steps: ['01-targets.md', '02-modules.md', '03-check.md'],
    sections: ['references'],
    h2: ['适用场景', '三种操作', '步骤', '入口表', '加载预算', '四类改动', '完成判据'],
  },
  'building-cpp': {
    title: 'building-cpp',
    steps: ['01-build.md', '02-tooling.md', '03-check.md', '04-vscode.md'],
    sections: ['references', 'examples'],
    h2: ['适用场景', '三种操作', '步骤', '入口表', '加载预算', '四类改动', '完成判据'],
  },
}

const skillMarkdown = []
for (const [skillName, spec] of Object.entries(SKILL_SPECS)) {
  const dir = join(skillsRoot, skillName)
  const skillFile = join(dir, 'SKILL.md')
  if (!ok(existsSync(skillFile), `${skillName}: 缺少 SKILL.md`)) continue
  const text = read(rel(skillFile))
  skillMarkdown.push(skillFile)
  ok(
    text.split(/\r?\n/).length <= 100,
    `${skillName}: SKILL.md 超过 100 行（${text.split(/\r?\n/).length}）`,
  )
  const fm = frontmatter(text)
  ok(Boolean(fm), `${skillName}: 缺少 frontmatter`)
  equal(fm?.data.name, skillName, `${skillName}: frontmatter name 与目录名`)
  ok(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fm?.data.name ?? ''), `${skillName}: name 不是 kebab-case`)
  ok(/C\+\+23/.test(fm?.data.description ?? ''), `${skillName}: description 未声明 C++23`)
  const description = fm?.data.description ?? ''
  ok([...description].length <= 450, `${skillName}: description 超过 450 字符`)
  ok(description.includes('不用于'), `${skillName}: description 缺少「不用于」`)
  ok(Boolean(fm?.data['metadata.short-description'] || /metadata:\s*\n\s+short-description:/.test(text)), `${skillName}: 缺少 metadata.short-description`)

  equal(h2s(fm?.body ?? text), spec.h2, `${skillName}: H2 节`)
  equal(h1(fm?.body ?? text), spec.title, `${skillName}: H1`)
  ok(text.includes('cpp-workflow-project'), `${skillName}: 未说明先读项目技能`)
  ok(text.includes('每步只打开同号'), `${skillName}: 未说明每步只打开一个步骤文件`)

  const stepsDir = join(dir, spec.stepRoot ?? 'steps')
  const stepFiles = existsSync(stepsDir)
    ? readdirSync(stepsDir).filter((name) => name.endsWith('.md')).sort()
    : []
  equal(stepFiles, spec.steps, `${skillName}: steps 文件`)

  for (const [index, stepFile] of spec.steps.entries()) {
    const abs = join(stepsDir, stepFile)
    if (!existsSync(abs)) continue
    const body = read(rel(abs))
    ok(
      new RegExp(`^# 第 ${index + 1} 步：`).test(withoutFences(body)),
      `${skillName}/${stepFile}: H1 必须从第 ${index + 1} 步开始`,
    )
    skillMarkdown.push(abs)
  }

  const tableRows = [...(fm?.body ?? '').matchAll(/^\|\s*(\d+)\s*\|[^|\n]*\|\s*`((?:cmake\/)?steps\/[^`]+)`\s*\|/gm)]
  equal(tableRows.length, spec.steps.length, `${skillName}: 步骤表行数`)
  for (const [index, row] of tableRows.entries()) {
    equal(Number(row[1]), index + 1, `${skillName}: 步骤表第 ${index + 1} 行编号`)
    equal(row[2], `${spec.stepRoot ?? 'steps'}/${spec.steps[index]}`, `${skillName}: 步骤表第 ${index + 1} 行文件`)
  }

  for (const section of spec.sections) {
    const sectionDir = join(dir, section)
    const files = existsSync(sectionDir) ? listFiles(sectionDir) : []
    ok(files.length > 0, `${skillName}: ${section} 为空`)
    for (const file of files) skillMarkdown.push(file)
  }
}

// 本地 Markdown 链接必须能在仓库内解析。
const docMarkdown = ['README.md', 'README.en.md']
for (const doc of ['docs', 'templates']) {
  const dir = join(ROOT, doc)
  if (existsSync(dir)) docMarkdown.push(...listFiles(dir).map(rel))
}
checkMarkdownLinks([...new Set([...skillMarkdown.map(rel), ...docMarkdown])].map((item) => join(ROOT, item)))

// 目录级可达性：从三份入口表出发，沿文件路径、祖先目录（至少两级，
// 如 references/language/）与本地链接逐层标记；references 下的 Markdown
// 必须全部可达。目录引用后必须是非路径字符，避免误匹配子目录。
const entryTexts = Object.keys(SKILL_SPECS).map((skillName) => {
  const text = withoutFences(read(`skills/${skillName}/SKILL.md`))
  const start = text.indexOf('## 入口表')
  if (start < 0) return ''
  const rest = text.slice(start + '## 入口表'.length)
  const end = rest.search(/\n## /)
  return end < 0 ? rest : rest.slice(0, end)
})

function isCited(text, candidate) {
  for (let index = text.indexOf(candidate); index !== -1; index = text.indexOf(candidate, index + 1)) {
    const next = text[index + candidate.length]
    if (next === undefined || !/[A-Za-z0-9_./-]/.test(next)) return true
  }
  return false
}

const skillFiles = [...new Set(skillMarkdown.map(rel))]
const skillTexts = new Map(skillFiles.map((file) => [file, withoutFences(read(file))]))
const referenceMarkdown = skillFiles.filter((file) => /^skills\/[^/]+\/references\/.+\.md$/.test(file))

for (const file of referenceMarkdown) {
  const text = skillTexts.get(file) ?? ''
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? ''
  ok(
    /^<!-- 读取时机：.+；读完能回答：.+；预算：/.test(first),
    `${file}: 首行缺少读取时机/读完能回答/预算`,
  )
  const budget = first.match(/预算：.*?（(\d+) 行）/)
  if (budget) {
    const bodyLines = read(file).trimEnd().split(/\r?\n/).length - 1
    ok(
      Number(budget[1]) === bodyLines,
      `${file}: 首行预算 ${budget[1]} 行与正文 ${bodyLines} 行不一致`,
    )
  }
}

const referenceBasenames = new Map()
for (const file of referenceMarkdown) {
  const base = basename(file)
  if (base === 'index.md') continue
  const previous = referenceBasenames.get(base)
  ok(!previous, `references 文件名重复：${previous ?? ''} 与 ${file}`)
  referenceBasenames.set(base, file)
}

for (const skill of ['developing-cpp', 'engineering']) {
  const indexFile = `skills/${skill}/references/index.md`
  if (!existsSync(join(ROOT, indexFile))) continue
  for (const line of read(indexFile).split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`.*?一次只开这一份（(\d+) 行）/)
    if (!match) continue
    const target = `skills/${skill}/references/${match[1]}`
    if (!existsSync(join(ROOT, target))) {
      ok(false, `${indexFile}: 指向不存在的 ${match[1]}`)
      continue
    }
    const bodyLines = read(target).trimEnd().split(/\r?\n/).length - 1
    ok(
      Number(match[2]) === bodyLines,
      `${indexFile}: ${match[1]} 预算 ${match[2]} 行与正文 ${bodyLines} 行不一致`,
    )
  }
}

const paragraphSeen = new Map()
for (const [file, text] of skillTexts) {
  const body = text.replace(/<!--[\s\S]*?-->/g, '')
  for (const block of body.split(/\r?\n\s*\r?\n/)) {
    const paragraph = block.replace(/\s+/g, ' ').trim()
    if (paragraph.length < 40) continue
    const previous = paragraphSeen.get(paragraph)
    if (previous) {
      ok(false, `重复段落：${previous} 与 ${file}`)
      break
    }
    paragraphSeen.set(paragraph, file)
  }
}

function citedBy(text, file) {
  const skillName = file.split('/')[1]
  const fromSkill = file.slice(`skills/${skillName}/`.length)
  const candidates = new Set([fromSkill, fromSkill.replace(/^references\//, '')])
  return [...candidates].some((candidate) => isCited(text, candidate))
}

function linkedBy(file, text) {
  const base = dirname(join(ROOT, file))
  const targets = []
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split(/\s+/)[0].split('#')[0]
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue
    const resolved = rel(resolve(base, target))
    if (skillTexts.has(resolved)) targets.push(resolved)
  }
  return targets
}

const reachable = new Set()
const queue = []
function discover(files) {
  for (const file of files) {
    if (skillTexts.has(file) && !reachable.has(file)) {
      reachable.add(file)
      queue.push(file)
    }
  }
}

for (const text of entryTexts) discover(skillFiles.filter((file) => citedBy(text, file)))
while (queue.length > 0) {
  const file = queue.shift()
  const text = skillTexts.get(file)
  discover(skillFiles.filter((target) => citedBy(text, target)))
  discover(linkedBy(file, text))
}

const unreachable = referenceMarkdown.filter((file) => !reachable.has(file))
ok(
  unreachable.length === 0,
  `入口表无法到达的参考文件（${unreachable.length}）：${unreachable.slice(0, 8).join('、')}${unreachable.length > 8 ? ' 等' : ''}`,
)

// ---------------------------------------------------------------------------
// 架构与触发文档
// ---------------------------------------------------------------------------

const architecture = read('docs/architecture.md')
equal(h1(architecture), '技能架构', 'docs/architecture.md: H1')
ok(/```mermaid\s*[\s\S]*?flowchart/.test(architecture), 'docs/architecture.md: 缺少 Mermaid 数据流图')
for (const token of [
  'developing-cpp',
  'engineering',
  'building-cpp',
  'cpp-workflow-project',
  'checking-comments.mjs',
  'checking-environment.mjs',
  'checking-declaration-order.mjs',
  'environment.json',
  'compile_commands.json',
]) {
  ok(architecture.includes(token), `docs/architecture.md: 缺少 ${token}`)
}
const moduleLayout = read('docs/module-layout.md')
for (const skill of ['developing-cpp', 'engineering', 'building-cpp']) {
  const dir = join(ROOT, 'skills', skill)
  for (const abs of listFiles(dir).filter((file) => /\.(md|mjs)$/.test(file))) {
    ok(moduleLayout.includes(basename(abs)), `docs/module-layout.md: 缺少 ${rel(abs)}`)
  }
}

const triggering = read('docs/triggering.md')
equal(h1(triggering), '触发与分流', 'docs/triggering.md: H1')
equal(h2s(triggering), ['判据', '触发矩阵', '反例', '验证与维护'], 'docs/triggering.md: H2 节')
for (const token of [
  'CMake',
  'Ninja',
  'clang-format',
  'clang-tidy',
  'clangd',
  'C++23',
  '注释',
  '异常',
  '命名',
  'developing-cpp',
  'engineering',
  'building-cpp',
]) {
  ok(triggering.includes(token), `docs/triggering.md: 缺少关键词 ${token}`)
}
ok(
  [...triggering.matchAll(/^\|\s*\d+\s*\|/gm)].length >= 12,
  'docs/triggering.md: 触发矩阵与反例合计少于 12 行',
)
ok((triggering.match(/都不出现/g) ?? []).length >= 6, 'docs/triggering.md: 反例行少于 6 条')

for (const readme of ['README.md', 'README.en.md']) {
  const text = read(readme)
  ok(text.includes('docs/architecture.md'), `${readme}: 未链接 docs/architecture.md`)
  ok(text.includes('docs/triggering.md'), `${readme}: 未链接 docs/triggering.md`)
}
ok(read('docs/plugin-layout.md').includes('architecture.md'), 'docs/plugin-layout.md: 目录树缺少 architecture.md')
ok(read('docs/plugin-layout.md').includes('triggering.md'), 'docs/plugin-layout.md: 目录树缺少 triggering.md')

// 禁止残留：旧步骤号与已删除的格式回退。
const SCANNED = new Set()
for (const base of ['skills', 'templates', 'docs', 'locale']) {
  const dir = join(ROOT, base)
  if (!existsSync(dir)) continue
  for (const file of listFiles(dir)) SCANNED.add(file)
}
for (const extra of ['README.md', 'README.en.md', 'cordis.patch.yml', 'package.json']) {
  if (existsSync(join(ROOT, extra))) SCANNED.add(join(ROOT, extra))
}
const FORBIDDEN = [
  ['旧步骤号 05-07', /第\s*0?[5-7]\s*步/],
  ['旧步骤文件 05-07', /steps\/0?[5-7]-/],
]
for (const abs of SCANNED) {
  const text = readFileSync(abs, 'utf8')
  for (const [label, pattern] of FORBIDDEN) {
    ok(!pattern.test(text), `${rel(abs)}: 含${label}`)
  }
  ok(!text.includes('--fallback-style'), `${rel(abs)}: 不应回退格式基线`)
  if (rel(abs).endsWith('.sh')) {
    ok(!text.includes('--exclude-header-filter'), `${rel(abs)}: clang-tidy 19 之前没有 --exclude-header-filter`)
    ok(!text.includes('greeting/'), `${rel(abs)}: header-filter 不应硬编码 greeting`)
  }
}

// 参考页不得再指向已删除的四技能编号。
for (const abs of listFiles(join(ROOT, 'skills')).filter((file) => file.endsWith('.md'))) {
  const text = read(rel(abs))
  ok(!/第\s*0?[5-7]\s*步/.test(text), `${rel(abs)}: 仍引用 05-07 步`)
  ok(!/`steps\/0?[5-7]-/.test(text), `${rel(abs)}: 仍引用 05-07 步文件`)
}

// ---------------------------------------------------------------------------
// 工程模板与构建资产
// ---------------------------------------------------------------------------

const templateRoot = join(ROOT, 'templates', 'cpp-workflow-project')
const templateFiles = listFiles(templateRoot).map((file) => relative(templateRoot, file).split(sep).join('/'))
equal(templateFiles.sort(), ['SKILL.md', 'environment.json', 'stages/stage-table.md'], '项目模板文件')

const templateSkill = read('templates/cpp-workflow-project/SKILL.md')
const templateFm = frontmatter(templateSkill)
equal(templateFm?.data.name, 'cpp-workflow-project', '模板技能 name')
ok(templateSkill.includes('复制整个目录'), '模板未说明复制整个目录')
ok(templateSkill.includes('<project-name>'), '模板缺少工程名空位')
ok(templateSkill.includes('<entry-command>'), '模板缺少入口命令空位')
ok(templateSkill.includes('stages/stage-table.md'), '模板缺少阶段表路径')
ok(!/developing-cpp|engineering|building-cpp/.test(templateSkill), '模板不应重复插件技能正文')

const templateEnvironment = readJson('templates/cpp-workflow-project/environment.json')
if (templateEnvironment) {
  equal(Object.keys(templateEnvironment), ['host', 'build_host', 'compiler', 'standard'], '模板 environment.json 键')
  for (const axis of ['host', 'build_host', 'compiler']) {
    equal(templateEnvironment[axis], '', `模板 environment.json 的 ${axis} 必须为空`)
  }
  equal(templateEnvironment.standard, 'c++23', '模板 environment.json 默认 C++23')
}

const stageTable = read('templates/cpp-workflow-project/stages/stage-table.md')
const stageRows = stageTable.split(/\r?\n/).filter((line) => line.trim().startsWith('|'))
equal(stageRows[0]?.replace(/\s+/g, ' ').trim(), '| 阶段 | 可观察行为 | 特殊依据 |', '模板阶段表表头')
ok(stageRows.length === 2, '模板阶段表必须为空表，只留表头与分隔行')

const assetRoot = join(ROOT, 'skills', 'building-cpp', 'assets')
for (const cmakeFile of listFiles(assetRoot).filter((file) => basename(file) === 'CMakeLists.txt')) {
  const text = read(rel(cmakeFile))
  ok(/target_compile_features\s*\(/.test(text), `${rel(cmakeFile)}: 缺少 target_compile_features`)
  ok(/cxx_std_23/.test(text), `${rel(cmakeFile)}: 缺少 cxx_std_23`)
  ok(/CXX_EXTENSIONS\s+OFF/.test(text), `${rel(cmakeFile)}: 缺少 CXX_EXTENSIONS OFF`)
  ok(!/(?<!target_)include_directories\s*\(/.test(text), `${rel(cmakeFile)}: 不应有全局 include_directories`)
  ok(!/file\s*\(\s*GLOB/i.test(text), `${rel(cmakeFile)}: 不应使用 GLOB`)
  ok(!/aux_source_directory/i.test(text), `${rel(cmakeFile)}: 不应使用 aux_source_directory`)
  ok(!/-march|-ffast-math/.test(text), `${rel(cmakeFile)}: 不应写死优化/架构参数`)
}

const clangFormat = read('skills/building-cpp/assets/config/.clang-format')
ok(clangFormat.includes('BasedOnStyle: Google'), 'clang-format 未采用 Google 预设')
ok(clangFormat.includes('Standard: Latest'), 'clang-format 未使用 Latest（兼容 C++23）')
ok(!/ColumnLimit|TabWidth|IncludeCategories/.test(clangFormat), 'clang-format 不应覆盖 Google 预设')
const clangTidy = read('skills/building-cpp/assets/config/.clang-tidy')
ok(/Checks:/.test(clangTidy), 'clang-tidy 缺少 Checks')
const clangd = read('skills/building-cpp/assets/config/.clangd')
ok(/CompilationDatabase:/.test(clangd), '.clangd 缺少 CompilationDatabase')
ok(!/-std=/.test(clangd), '.clangd 不应写死 -std，标准由 compile_commands.json 决定')

const standardsRoot = join(ROOT, 'skills', 'engineering', 'references', 'cmake', 'standards')
const standardIds = ['c++11', 'c++14', 'c++17', 'c++20', 'c++23']
equal(
  readdirSync(standardsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('c++'))
    .map((entry) => entry.name)
    .sort(),
  standardIds,
  'standards 标准目录',
)
const standards = read('skills/engineering/references/cmake/standards/index.md')
const versions = read('skills/engineering/references/cmake/standards/versions.md')
for (const standard of standardIds) {
  const label = standard.replace('c++', 'C++')
  ok(standards.includes(standard), `standards/index.md 缺少 ${standard}`)
  ok(versions.includes(`## ${label}`), `standards/versions.md 缺少 ${label}`)
  const number = standard.replace('c++', '')
  const snippet = read(`skills/engineering/references/cmake/standards/${standard}/cmake-snippet.cmake`)
  ok(snippet.includes(`cxx_std_${number}`), `${standard}/cmake-snippet.cmake 缺少 cxx_std_${number}`)
  ok(snippet.includes(`CXX_STANDARD ${number}`), `${standard}/cmake-snippet.cmake 缺少 CXX_STANDARD ${number}`)
  ok(snippet.includes('CXX_STANDARD_REQUIRED ON'), `${standard}/cmake-snippet.cmake 缺少 CXX_STANDARD_REQUIRED ON`)
  ok(snippet.includes('CXX_EXTENSIONS OFF'), `${standard}/cmake-snippet.cmake 缺少 CXX_EXTENSIONS OFF`)
}
ok(standards.includes('Latest'), 'standards/index.md 未说明 clang-format 21/22 的 Latest fallback')
ok(standards.includes('CXX_STANDARD_REQUIRED ON'), 'standards/index.md 未说明 CXX_STANDARD_REQUIRED')
ok(standards.includes('三个规划粒度'), 'standards/index.md 未说明项目/target/代码/验证粒度')
ok(existsSync(join(ROOT, 'scripts', 'checking-standard-matrix.sh')), 'scripts/checking-standard-matrix.sh 不存在')
ok(packageJson.scripts?.['test:matrix'] === 'bash scripts/checking-standard-matrix.sh', 'package.json 未提供 test:matrix 脚本')
ok(read('scripts/checking-standard-matrix.sh').startsWith('#!/usr/bin/env bash'), 'scripts/checking-standard-matrix.sh 缺少 bash shebang')

const buildScript = read('skills/building-cpp/assets/templates/projects/common/running-build.sh')
ok(buildScript.includes('COMPILER="${1:-clang}"'), '构建脚本省略参数时应默认 clang')
ok(buildScript.includes('BUILD_DIR="${BUILD_ROOT}/${COMPILER}"'), '构建脚本必须按编译器分目录')
ok(buildScript.includes('compile_commands.json'), '构建脚本缺少编译数据库链接')
ok(buildScript.includes('ctest --test-dir'), '构建脚本缺少 CTest')
ok(buildScript.includes('--output-on-failure'), '构建脚本缺少 CTest 失败输出')
ok(!buildScript.includes('--fallback-style'), '构建脚本不应回退格式基线')
ok(!/greeting\//.test(buildScript), '构建脚本 header-filter 不应硬编码 greeting')

const buildRef = read('skills/building-cpp/references/01-build-script.md')
ok(buildRef.includes('省略时默认 `clang`'), '构建脚本文档未说明默认 clang')
ok(!/第\s*0?[5-7]\s*步/.test(buildRef), '构建脚本文档仍引用旧步骤号')

// Shell 语法与 Node 语法。依赖目录与 VCS 目录不是工程的 shell 资产；
// 扫描它们会让检查依赖已安装的包。
for (const file of listFiles(ROOT).filter((item) => {
  if (!item.endsWith('.sh')) return false
  const relativePath = rel(item)
  return !relativePath.startsWith('node_modules/') && !relativePath.startsWith('.git/')
})) {
  try {
    execFileSync('bash', ['-n', file], { stdio: 'pipe' })
    checks += 1
  } catch (error) {
    failures.push(`${rel(file)}: bash -n 失败（${error.stderr?.toString().trim() || error.message}）`)
  }
}
for (const file of [
  join(ROOT, 'skills', 'building-cpp', 'scripts', 'checking-environment.mjs'),
  join(ROOT, 'skills', 'engineering', 'scripts', 'checking-encoding.mjs'),
  join(ROOT, 'scripts', 'checking-skill-links.mjs'),
]) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    checks += 1
  } catch (error) {
    failures.push(`${rel(file)}: node --check 失败（${error.stderr?.toString().trim() || error.message}）`)
  }
}

// ---------------------------------------------------------------------------
// 文档、README 与工作流
// ---------------------------------------------------------------------------

const docs = [
  'architecture.md',
  'comment-sources.md',
  'design-principles.md',
  'module-layout.md',
  'plugin-boundaries.md',
  'plugin-flow.md',
  'plugin-layout.md',
  'plugin-storage.md',
  'triggering.md',
  'versioning.md',
]
equal(
  readdirSync(join(ROOT, 'docs')).filter((name) => name.endsWith('.md')).sort(),
  docs,
  'docs 文件',
)
for (const doc of docs) {
  const abs = join(ROOT, 'docs', doc)
  ok(existsSync(abs), `缺少 docs/${doc}`)
  if (existsSync(abs)) ok(Boolean(h1(read(`docs/${doc}`))), `docs/${doc}: 缺少 H1`)
}
const boundaries = read('docs/plugin-boundaries.md')
ok(boundaries.includes('.agents/skills/cpp-workflow-project/SKILL.md'), '边界文档缺少项目技能标记')
ok(boundaries.includes('64'), '边界文档缺少 64 层 git 根上限')
ok(!boundaries.includes('4000'), '边界文档不应再写源文件扫描上限')
ok(read('docs/plugin-layout.md').includes('files'), '布局文档缺少 files 白名单说明')
ok(read('docs/versioning.md').includes('## 修订号'), '版本文档缺少修订号规则')
ok(read('docs/versioning.md').includes('## 次版本'), '版本文档缺少次版本规则')

const domains = ['内容', '结构', '版式', '措辞']
const domainRowLines = (text, heading) => {
  const lines = withoutFences(text).split('\n')
  const start = lines.findIndex((line) => line.trim() === heading)
  if (start === -1) return []
  const rows = []
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{2,3}\s+/.test(lines[index])) break
    if (/^\| (内容|结构|版式|措辞) \|/.test(lines[index])) rows.push(lines[index])
  }
  return rows
}
const domainNames = (lines) => lines.map((line) => line.split('|')[1].trim())
const skillNames = ['developing-cpp', 'engineering', 'building-cpp']
for (const skill of skillNames) {
  const rows = domainRowLines(read(`skills/${skill}/SKILL.md`), '## 四类改动')
  equal(domainNames(rows), domains, `${skill} SKILL.md 四类改动的域名与顺序`)
  ok(rows.length === 4, `${skill} SKILL.md 四类改动的行数`)
  ok(
    rows.every((line) => line.includes('steps/') && line.includes('.md`')),
    `${skill} SKILL.md 四类改动缺少步骤入口`,
  )
}

const architectureText = read('docs/architecture.md')
ok(architectureText.includes('## 三个技能的四类改动'), 'architecture.md 缺少四类改动说明节')
for (const skill of skillNames) {
  ok(architectureText.includes(`skills/${skill}/SKILL.md`), `architecture.md 缺少 ${skill} 的 SKILL.md 指针`)
}
const copiedDomainTable = ['内容', '结构', '版式', '措辞'].some((domain) =>
  architectureText.includes(`| ${domain} |`),
)
ok(!copiedDomainTable, 'architecture.md 不应复制四类改动表')

const readmeZh = read('README.md')
const readmeEn = read('README.en.md')
equal(
  h2s(readmeZh),
  ['提供什么', '安装', '工作区门禁', '项目级约定', '环境组合', '包结构', '本地开发', '许可'],
  'README.md H2',
)
equal(
  h2s(readmeEn),
  ['What it provides', 'Install', 'Workspace gate', 'Project conventions', 'Environment combinations', 'Package layout', 'Local development', 'License'],
  'README.en.md H2',
)
const version = packageJson?.version ?? ''
ok(version !== '', 'package.json 缺少 version')
// README 钉死的是用户此刻能装到的版本，发布前可以落后于 package.json；
// 这里只要求中英 README 各自给出带具体版本号的 npm 与 Git 标签安装命令。
const checkPins = (text, label) => {
  ok(/@chengzhao-dev\/dsh-cpp-workflow@\d+\.\d+\.\d+/.test(text), `${label} 缺少钉死版本的 npm 安装命令`)
  ok(/github:chengzhao-dev\/dsh-cpp-workflow#v\d+\.\d+\.\d+/.test(text), `${label} 缺少 Git 标签安装命令`)
}
checkPins(readmeZh, 'README')
checkPins(readmeEn, 'README.en')

const creation = read('.github/creation-references.md')
ok(creation.includes('deepseek-harness.github.io'), '创建依据缺少官方文档')
ok(creation.includes('dsh.so'), '创建依据缺少 dsh.so 周榜')
ok(creation.includes('generatedAt'), '创建依据缺少 generatedAt')

const ci = read('.github/workflows/ci.yml')
ok(/push:[\s\S]*branches:\s*\[main\]/.test(ci), 'ci.yml 缺少 main 分支 push')
ok(/pull_request:/.test(ci), 'ci.yml 缺少 pull_request')
ok(ci.includes('node-version: 24'), 'ci.yml 未使用 Node 24')
ok(ci.includes('npm ci') && ci.includes('npm test'), 'ci.yml 未运行 npm ci/test')

const publish = read('.github/workflows/publish.yml')
ok(/tags:[\s\S]*v\*/.test(publish), 'publish.yml 未限定 v* 标签')
ok(publish.includes('id-token: write'), 'publish.yml 缺少 id-token: write')
ok(publish.includes('contents: write'), 'publish.yml 缺少 contents: write')
ok(!publish.includes('pull_request'), 'publish.yml 不应在 pull request 上发布')
ok(publish.includes('npm ci') && publish.includes('npm test'), 'publish.yml 未运行 npm ci/test')
ok(publish.includes('npm publish'), 'publish.yml 未运行 npm publish')
ok(!publish.includes('npm publish --provenance'), 'publish.yml 不应重复传 --provenance')
ok(!publish.includes('npm run build'), 'publish.yml 不应重复 npm test 中的 build')
ok(publish.includes('gh release create'), 'publish.yml 未创建 GitHub Release')
ok(publish.includes('--verify-tag'), 'publish.yml 创建 Release 时未校验标签')

// ---------------------------------------------------------------------------
// 构建入口与 schema 门禁
// ---------------------------------------------------------------------------

const libEntry = join(ROOT, 'lib', 'index.js')
if (ok(existsSync(libEntry), '缺少 lib/index.js，先运行 npm run build')) {
  const mod = await import(pathToFileURL(libEntry).href)
  equal(Object.keys(mod).sort(), ['Config', 'apply', 'inject', 'name'], '入口运行时导出')
  equal(mod.name, 'dsh-cpp-workflow', '入口 name')
  equal(mod.inject, ['skills'], '入口 inject')
  ok(typeof mod.apply === 'function', '入口 apply 不是函数')
  ok(typeof mod.Config === 'function', '入口 Config 不是 Schemastery schema')
}

const libClient = join(ROOT, 'lib', 'client.js')
if (ok(existsSync(libClient), '缺少 lib/client.js，先运行 npm run build')) {
  const client = read('lib/client.js')
  ok(client.startsWith('// 由 scripts/building-client.mjs 生成'), 'lib/client.js 必须由构建脚本生成')
  ok(client.includes('window.__ModuleLoader__.load({'), 'lib/client.js 缺少 Cordis 客户端外壳')
  ok(client.includes("id: \"@chengzhao-dev/dsh-cpp-workflow\""), 'lib/client.js 的包名不对')
  ok(!client.includes("'settings.section'"), 'lib/client.js 不应再注册设置页；插件页是唯一入口')
  ok(client.includes("'plugins.bundle.config'"), 'lib/client.js 未注册插件页配置卡片')
}
ok(existsSync(join(ROOT, 'lib', 'workspace.js')), '缺少 lib/workspace.js，先运行 npm run build')

const entrySource = read('src/index.ts')
ok(!/\bctx\.tools\b|\bregisterTool\b/.test(entrySource), '入口不应注册工具')
ok(!/\banyOf\b|\bmaxItems\b|\bminimum\b/.test(entrySource), '入口源码不应出现未支持的 schema 关键字')

const schemaTest = read('tests/schema.test.mjs')
ok(schemaTest.includes('assertSchemaSubset'), 'schema 测试缺少 assertSchemaSubset')
ok(schemaTest.includes('oneOf'), 'schema 测试未覆盖 oneOf')
ok(schemaTest.includes('additionalProperties'), 'schema 测试未覆盖 additionalProperties')

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`结构检查失败：${failures.length} 项（已通过 ${checks} 项）`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`结构检查通过：${checks} 项`)
}
