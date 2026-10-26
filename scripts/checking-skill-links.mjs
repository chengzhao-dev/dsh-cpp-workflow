#!/usr/bin/env node
// Structural checks for the packaged C++ workflow skills.
//
// This script guards the parts that are easy to drift by hand: package metadata,
// the one-row bundle patch, the two-skill layout, step numbering, local links,
// the empty project template, the build assets, and the README/docs surface.
// It performs no network access and does not need a C++ compiler.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
      ok(existsSync(resolved), `${rel(abs)}: 链接指向不存在的 ${target}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Package metadata
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
  const descriptionParts = description.split(' · ')
  ok(descriptionParts.length === 2, 'description 必须是「中文 · 英文」两段')
  ok(/[\u4e00-\u9fff]/.test(descriptionParts[0] ?? ''), 'description 前半段必须是中文')
  ok(!/[\u4e00-\u9fff]/.test(descriptionParts[1] ?? ''), 'description 后半段不应含中文')

  equal(packageJson.engines?.node, '>=22', 'engines.node')
  equal(packageJson.engines?.dsh, '>=0.2.0-rc.1 <0.3.0-0', 'engines.dsh')
  equal(packageJson.peerDependencies?.['@deepseek-ai/dsh-skill'], '>=0.2.0-rc.1 <0.3.0-0', 'peer 范围')
  equal(packageJson.devDependencies?.['@deepseek-ai/dsh-skill'], '>=0.2.0-rc.1 <0.3.0-0', 'dev 范围')
  ok(Boolean(packageJson.devDependencies?.typescript), '缺少 TypeScript devDependency')

  equal(packageJson.publishConfig?.access, 'public', 'publishConfig.access')
  ok(!existsSync(join(ROOT, '.npmignore')), '不应保留与 files 白名单重复的 .npmignore')
  equal(packageJson.publishConfig?.provenance, true, 'publishConfig.provenance')
  ok(packageJson.repository?.url?.includes('github.com/chengzhao-dev/dsh-cpp-workflow'), 'repository 指向 GitHub')
  equal(packageJson.scripts?.build, 'tsc -p tsconfig.json', 'build 脚本')
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
  ok(!('client' in (packageJson.dsh ?? {})), '本包不应声明 dsh.client')

  equal(packageJson.exports?.['.'], './lib/index.js', 'exports["."]')
  equal(packageJson.exports?.['./cordis.patch.yml'], './cordis.patch.yml', 'exports patch')
  equal(packageJson.icon, './icon.svg', 'icon 字段')
}

// package-lock stays in sync with the scoped name.
const packageLock = readJson('package-lock.json')
if (packageLock && packageJson) {
  equal(packageLock.name, '@chengzhao-dev/dsh-cpp-workflow', 'package-lock.name')
  equal(packageLock.version, packageJson.version, 'package-lock.version')
  equal(packageLock.packages?.['']?.name, '@chengzhao-dev/dsh-cpp-workflow', 'package-lock 根包名')
  equal(packageLock.packages?.['']?.version, packageJson.version, 'package-lock 根包版本')
}

// ---------------------------------------------------------------------------
// Bundle patch, locale, icon
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
// Three skills and their steps
// ---------------------------------------------------------------------------

const skillsRoot = join(ROOT, 'skills')
const skillDirs = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
equal(skillDirs, ['building-cpp', 'configuring-cmake', 'developing-cpp'], 'skills 目录')

const SKILL_SPECS = {
  'developing-cpp': {
    title: 'developing-cpp',
    steps: ['01-behavior.md', '02-boundary.md', '03-declaration.md', '04-implementation.md'],
    h2: ['适用场景', '两种走法', '步骤', '完成判据'],
  },
  'configuring-cmake': {
    title: 'configuring-cmake',
    steps: ['01-targets.md', '02-modules.md', '03-check.md'],
    h2: ['适用场景', '两种走法', '步骤', '完成判据'],
  },
  'building-cpp': {
    title: 'building-cpp',
    steps: ['01-build.md', '02-tooling.md', '03-check.md'],
    h2: ['适用场景', '两种走法', '步骤', '完成判据'],
  },
}

const skillMarkdown = []
for (const [skillName, spec] of Object.entries(SKILL_SPECS)) {
  const dir = join(skillsRoot, skillName)
  const skillFile = join(dir, 'SKILL.md')
  if (!ok(existsSync(skillFile), `${skillName}: 缺少 SKILL.md`)) continue
  const text = read(rel(skillFile))
  skillMarkdown.push(skillFile)
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

  const stepsDir = join(dir, 'steps')
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

  const tableRows = [...(fm?.body ?? '').matchAll(/^\|\s*(\d+)\s*\|[^|\n]*\|\s*`(steps\/[^`]+)`\s*\|/gm)]
  equal(tableRows.length, spec.steps.length, `${skillName}: 步骤表行数`)
  for (const [index, row] of tableRows.entries()) {
    equal(Number(row[1]), index + 1, `${skillName}: 步骤表第 ${index + 1} 行编号`)
    equal(row[2], `steps/${spec.steps[index]}`, `${skillName}: 步骤表第 ${index + 1} 行文件`)
  }

  for (const section of ['references', 'examples']) {
    const sectionDir = join(dir, section)
    const files = existsSync(sectionDir) ? listFiles(sectionDir) : []
    ok(files.length > 0, `${skillName}: ${section} 为空`)
    for (const file of files) skillMarkdown.push(file)
  }
}

// Local Markdown links must resolve inside the repository.
const docMarkdown = ['README.md', 'README.en.md']
for (const doc of ['docs', 'templates']) {
  const dir = join(ROOT, doc)
  if (existsSync(dir)) docMarkdown.push(...listFiles(dir).map(rel))
}
checkMarkdownLinks([...new Set([...skillMarkdown.map(rel), ...docMarkdown])].map((item) => join(ROOT, item)))

// ---------------------------------------------------------------------------
// Architecture and trigger docs
// ---------------------------------------------------------------------------

const architecture = read('docs/architecture.md')
equal(h1(architecture), '技能架构', 'docs/architecture.md: H1')
ok(/```mermaid\s*[\s\S]*?flowchart/.test(architecture), 'docs/architecture.md: 缺少 Mermaid 数据流图')
for (const token of [
  'developing-cpp',
  'configuring-cmake',
  'building-cpp',
  'cpp-workflow-project',
  'checking-comments.mjs',
  'checking-environment.mjs',
  'environment.json',
  'compile_commands.json',
]) {
  ok(architecture.includes(token), `docs/architecture.md: 缺少 ${token}`)
}
for (const skill of ['developing-cpp', 'configuring-cmake', 'building-cpp']) {
  for (const section of ['steps', 'references', 'examples', 'scripts']) {
    const dir = join(ROOT, 'skills', skill, section)
    if (!existsSync(dir)) continue
    for (const abs of listFiles(dir).filter((file) => /\.(md|mjs)$/.test(file))) {
      ok(architecture.includes(basename(abs)), `docs/architecture.md: 文件职责缺少 ${rel(abs)}`)
    }
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
  'configuring-cmake',
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

// Forbidden leftovers: old step numbering and formatting fallbacks.
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

// Reference pages must not point at the removed four-skill numbering.
for (const abs of listFiles(join(ROOT, 'skills')).filter((file) => file.endsWith('.md'))) {
  const text = read(rel(abs))
  ok(!/第\s*0?[5-7]\s*步/.test(text), `${rel(abs)}: 仍引用 05-07 步`)
  ok(!/`steps\/0?[5-7]-/.test(text), `${rel(abs)}: 仍引用 05-07 步文件`)
}

// ---------------------------------------------------------------------------
// Project template and build assets
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
ok(!/developing-cpp|configuring-cmake|building-cpp/.test(templateSkill), '模板不应重复插件技能正文')

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

const standardsRoot = join(ROOT, 'skills', 'building-cpp', 'references', 'standards')
const standardIds = ['c++11', 'c++14', 'c++17', 'c++20', 'c++23']
equal(
  readdirSync(standardsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(),
  standardIds,
  'standards 标准目录',
)
const standards = read('skills/building-cpp/references/standards/README.md')
for (const standard of standardIds) {
  ok(standards.includes(standard), `standards/README.md 缺少 ${standard}`)
  const number = standard.replace('c++', '')
  const profile = read(`skills/building-cpp/references/standards/${standard}/README.md`)
  ok(profile.includes(`\`${standard}\``), `${standard}/README.md 缺少 standard id`)
  ok(profile.includes('__cplusplus'), `${standard}/README.md 缺少 __cplusplus`)
  ok(profile.includes('## 最重要的三件事'), `${standard}/README.md 缺少最重要的三件事`)
  ok(profile.includes('## 验证'), `${standard}/README.md 缺少验证`)
  const snippet = read(`skills/building-cpp/references/standards/${standard}/cmake-snippet.cmake`)
  ok(snippet.includes(`cxx_std_${number}`), `${standard}/cmake-snippet.cmake 缺少 cxx_std_${number}`)
  ok(snippet.includes(`CXX_STANDARD ${number}`), `${standard}/cmake-snippet.cmake 缺少 CXX_STANDARD ${number}`)
  ok(snippet.includes('CXX_STANDARD_REQUIRED ON'), `${standard}/cmake-snippet.cmake 缺少 CXX_STANDARD_REQUIRED ON`)
  ok(snippet.includes('CXX_EXTENSIONS OFF'), `${standard}/cmake-snippet.cmake 缺少 CXX_EXTENSIONS OFF`)
}
ok(standards.includes('Latest'), 'standards/README.md 未说明 clang-format 21/22 的 Latest fallback')
ok(standards.includes('CXX_STANDARD_REQUIRED ON'), 'standards/README.md 未说明 CXX_STANDARD_REQUIRED')
ok(standards.includes('三个规划粒度'), 'standards/README.md 未说明项目/target/代码/验证粒度')
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

const buildRef = read('skills/building-cpp/references/build-script.md')
ok(buildRef.includes('省略时默认 `clang`'), '构建脚本文档未说明默认 clang')
ok(!/第\s*0?[5-7]\s*步/.test(buildRef), '构建脚本文档仍引用旧步骤号')

// Shell syntax and Node syntax. Dependency and VCS trees are not project shell
// assets; scanning them would make the check depend on installed packages.
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
  join(ROOT, 'skills', 'building-cpp', 'scripts', 'checking-encoding.mjs'),
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
// Docs, README and workflows
// ---------------------------------------------------------------------------

const docs = [
  'architecture.md',
  'plugin-boundaries.md',
  'plugin-flow.md',
  'plugin-layout.md',
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

const domains = ['写作', '布局', '排版', '润色']
const domainRowLines = (text, heading) => {
  const lines = withoutFences(text).split('\n')
  const start = lines.findIndex((line) => line.trim() === heading)
  if (start === -1) return []
  const rows = []
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{2,3}\s+/.test(lines[index])) break
    if (/^\| (写作|布局|排版|润色) \|/.test(lines[index])) rows.push(lines[index])
  }
  return rows
}
const domainNames = (lines) => lines.map((line) => line.split('|')[1].trim())
const domainFiles = (lines) =>
  lines.map((line) => [...new Set(line.match(/`[a-z0-9-]+\.md`/g) ?? [])].sort())
for (const [skill, heading] of [
  ['developing-cpp', '### developing-cpp'],
  ['configuring-cmake', '### configuring-cmake'],
  ['building-cpp', '### building-cpp'],
]) {
  const skillRows = domainRowLines(read(`skills/${skill}/SKILL.md`), '### 四类改动')
  const architectureRows = domainRowLines(read('docs/architecture.md'), heading)
  equal(domainNames(skillRows), domains, `${skill} SKILL.md 四类改动的域名与顺序`)
  equal(domainNames(architectureRows), domains, `${skill} architecture.md 四类改动的域名与顺序`)
  equal(domainFiles(skillRows), domainFiles(architectureRows), `${skill} 两处四类改动的权威条文`)
}

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
const npmPin = `@chengzhao-dev/dsh-cpp-workflow@${version}`
const tagPin = `github:chengzhao-dev/dsh-cpp-workflow#v${version}`
ok(readmeZh.includes(npmPin), 'README 缺少钉死版本的 npm 安装命令')
ok(readmeZh.includes(tagPin), 'README 缺少 Git 标签安装命令')
ok(readmeEn.includes(npmPin), 'README.en 缺少钉死版本的 npm 安装命令')
ok(readmeEn.includes(tagPin), 'README.en 缺少 Git 标签安装命令')

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
// Built entry and schema gate
// ---------------------------------------------------------------------------

const libEntry = join(ROOT, 'lib', 'index.js')
if (ok(existsSync(libEntry), '缺少 lib/index.js，先运行 npm run build')) {
  const mod = await import(pathToFileURL(libEntry).href)
  equal(Object.keys(mod).sort(), ['apply', 'inject', 'name'], '入口运行时导出')
  equal(mod.name, 'dsh-cpp-workflow', '入口 name')
  equal(mod.inject, ['skills'], '入口 inject')
  ok(typeof mod.apply === 'function', '入口 apply 不是函数')
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
// Report
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`结构检查失败：${failures.length} 项（已通过 ${checks} 项）`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`结构检查通过：${checks} 项`)
}
