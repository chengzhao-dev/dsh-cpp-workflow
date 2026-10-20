#!/usr/bin/env node
// Structural self-check for the skill bundle. It validates file presence,
// numbering, routing links, config assets and package metadata; it does not run
// a compiler. `npm run check` calls it after `tsc --noEmit`.
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []

function fail(message) {
  errors.push(message)
}

function warn(message) {
  warnings.push(message)
}

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8')
}

function expectFile(relative) {
  if (!existsSync(path.join(root, relative))) fail(`缺少文件：${relative}`)
}

function expectDirectory(relative) {
  if (!existsSync(path.join(root, relative)) || !statSync(path.join(root, relative)).isDirectory()) {
    fail(`缺少目录：${relative}`)
  }
}

const expected = {
  'developing-cpp': [
    'SKILL.md',
    'steps/01-behavior.md',
    'steps/02-boundary.md',
    'steps/03-declaration.md',
    'steps/04-implementation.md',
    'references/google-cpp-style.md',
    'references/naming.md',
    'references/exceptions.md',
    'references/declaration-order.md',
    'references/comments.md',
    'references/layout.md',
    'references/glossary.md',
    'examples/structure.md',
    'examples/naming.md',
    'examples/comments.md',
    'examples/exceptions.md',
  ],
  'building-cpp': [
    'SKILL.md',
    'steps/05-build.md',
    'steps/06-tooling.md',
    'steps/07-check.md',
    'references/environment.md',
    'references/cmake.md',
    'references/static-analysis.md',
    'references/build-script.md',
    'examples/environment.md',
    'examples/cmake.md',
    'examples/tooling.md',
    'scripts/checking-environment.mjs',
    'assets/config/.clang-format',
    'assets/config/.clang-tidy',
    'assets/config/.clangd',
    'assets/config/.vscode/settings.json',
    'assets/config/.vscode/extensions.json',
    'assets/cmake/applying-warnings.cmake',
    'assets/cmake/fetching-googletest.cmake',
    'assets/cmake/setting-rpath.cmake',
    'assets/templates/projects/common/running-build.sh',
    'assets/templates/projects/single/CMakeLists.txt',
    'assets/templates/projects/multi/CMakeLists.txt',
    'assets/templates/projects/static-library/CMakeLists.txt',
    'assets/templates/projects/shared-library/CMakeLists.txt',
  ],
}

for (const [skill, files] of Object.entries(expected)) {
  expectDirectory(`skills/${skill}`)
  for (const file of files) expectFile(`skills/${skill}/${file}`)
}

for (const file of [
  'templates/cpp-workflow-project/SKILL.md',
  'templates/cpp-workflow-project/environment.json',
  'templates/cpp-workflow-project/stages/stage-table.md',
  'package.json',
  'cordis.patch.yml',
  'icon.svg',
  'README.md',
  'README.en.md',
  'LICENSE',
  'tsconfig.json',
  'src/index.ts',
  'lib/index.js',
  'locale/zh.json',
  'locale/en.json',
]) {
  expectFile(file)
}

// Frontmatter names and step headings.
const skills = [
  ['developing-cpp', ['1', '2', '3', '4']],
  ['building-cpp', ['5', '6', '7']],
]
for (const [skill, numbers] of skills) {
  const skillFile = `skills/${skill}/SKILL.md`
  if (!existsSync(path.join(root, skillFile))) continue
  const text = read(skillFile)
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)
  if (!match) {
    fail(`${skillFile} 缺少 frontmatter`)
  } else {
    const name = /^name:\s*(.+)$/m.exec(match[1])
    if (!name || name[1].trim() !== skill) {
      fail(`${skillFile} 的 name 必须是 ${skill}`)
    }
    const description = /^description:\s*(.+)$/m.exec(match[1])
    if (!description || description[1].trim().length < 10) {
      fail(`${skillFile} 的 description 太短或缺失`)
    }
    if (!/C\+\+20/.test(text.slice(0, 600))) {
      fail(`${skillFile} 的 frontmatter 附近没有提到 C++20`)
    }
  }

  for (const number of numbers) {
    const directory = `skills/${skill}/steps`
    const candidates = existsSync(path.join(root, directory))
      ? readdirSync(path.join(root, directory)).filter((name) => name.endsWith('.md'))
      : []
    const matchStep = candidates.find((name) => name.startsWith(`${number.padStart(2, '0')}-`))
    if (!matchStep) {
      fail(`${skill} 缺少第 ${number} 步文件`)
      continue
    }
    const textStep = read(`${directory}/${matchStep}`)
    const first = textStep.split(/\r?\n/).find((line) => line.startsWith('# '))
    if (!first || !first.startsWith(`# 第 ${number} 步`)) {
      fail(`${directory}/${matchStep} 的 H1 必须以「# 第 ${number} 步」开头`)
    }
  }
}

// No source-project vocabulary or knowledge-base identifiers in generic skills.
const banned = [
  { pattern: /kb_id/, label: 'kb_id' },
  { pattern: /\bbg-[a-z]/i, label: 'bg-* 知识库条目名' },
  { pattern: /\.agents\//, label: '.agents/ 路径' },
  { pattern: /tictactoe/i, label: 'tictactoe' },
  { pattern: /\bBoard\b/, label: 'Board' },
]
for (const skill of Object.keys(expected)) {
  const directory = path.join(root, 'skills', skill)
  if (!existsSync(directory)) continue
  for (const file of walk(directory)) {
    if (!file.endsWith('.md')) continue
    const text = readFileSync(file, 'utf8')
    for (const item of banned) {
      if (item.pattern.test(text)) {
        fail(`${path.relative(root, file)} 含有通用技能不应出现的 ${item.label}`)
      }
    }
  }
}

// Backticked relative routing paths must resolve inside the skill directory.
const routing = /`((?:steps|references|examples|assets|scripts|templates)\/[^`\s]+\.(?:md|mjs|sh|json|yml|yaml|cmake))`/g
for (const skill of Object.keys(expected)) {
  const directory = path.join(root, 'skills', skill)
  if (!existsSync(directory)) continue
  for (const file of walk(directory)) {
    if (!file.endsWith('.md')) continue
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(routing)) {
      const relative = match[1]
      if (!existsSync(path.join(directory, relative))) {
        fail(`${path.relative(root, file)} 引用了不存在的路径 ${relative}`)
      }
    }
  }
}

// Shell syntax for every shipped script.
for (const file of walk(path.join(root, 'skills'))) {
  if (!file.endsWith('.sh')) continue
  try {
    execFileSync('bash', ['-n', file], { stdio: 'pipe' })
  } catch (error) {
    fail(`${path.relative(root, file)} 未通过 bash -n：${error.stderr?.toString().trim() ?? ''}`)
  }
}

// Project template axes stay empty; the template is a form, not a guess.
try {
  const environment = JSON.parse(read('templates/cpp-workflow-project/environment.json'))
  for (const axis of ['host', 'build_host', 'compiler']) {
    if (environment[axis] !== '') {
      fail(`项目模板的 ${axis} 必须为空，实际是 ${JSON.stringify(environment[axis])}`)
    }
  }
  const extra = Object.keys(environment).filter(
    (key) => !['host', 'build_host', 'compiler'].includes(key),
  )
  if (extra.length > 0) fail(`项目模板 environment.json 含多余键：${extra.join(', ')}`)
} catch (error) {
  fail(`项目模板 environment.json 不是合法 JSON：${error.message}`)
}

// CMake templates must keep the standard on the target and reject GNU extensions.
for (const relative of [
  'skills/building-cpp/assets/templates/projects/single/CMakeLists.txt',
  'skills/building-cpp/assets/templates/projects/multi/CMakeLists.txt',
  'skills/building-cpp/assets/templates/projects/static-library/CMakeLists.txt',
  'skills/building-cpp/assets/templates/projects/shared-library/CMakeLists.txt',
  'skills/building-cpp/assets/templates/projects/static-library/greeting/CMakeLists.txt',
  'skills/building-cpp/assets/templates/projects/shared-library/greeting/CMakeLists.txt',
]) {
  if (!existsSync(path.join(root, relative))) continue
  const text = read(relative)
  if (!text.includes('target_compile_features')) fail(`${relative} 缺少 target_compile_features`)
  if (!text.includes('CXX_EXTENSIONS OFF')) fail(`${relative} 缺少 CXX_EXTENSIONS OFF`)
  if (/set\s*\(\s*CMAKE_CXX_STANDARD/.test(text)) fail(`${relative} 不应设置全局 CMAKE_CXX_STANDARD`)
  if (/(^|\n)\s*include_directories\s*\(/.test(text)) fail(`${relative} 不应使用全局 include_directories`)
}

const buildScript = read('skills/building-cpp/assets/templates/projects/common/running-build.sh')
for (const needle of ['--fallback-style=Google', 'ln -s', 'clang-tidy -p']) {
  if (!buildScript.includes(needle)) fail(`running-build.sh 缺少 ${needle}`)
}

// Package metadata and bundle wiring.
try {
  const pkg = JSON.parse(read('package.json'))
  if (pkg.name !== 'dsh-cpp-workflow') fail(`package.json name 应为 dsh-cpp-workflow，实际 ${pkg.name}`)
  if (pkg.type !== 'module') fail('package.json type 必须是 module')
  if (pkg.main !== './lib/index.js') fail('package.json main 必须是 ./lib/index.js')
  if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') fail('package.json dsh.bundle.patch 配置错误')
  if (!pkg.engines?.dsh) fail('package.json 缺少 engines.dsh')
  if (!pkg.engines?.node) fail('package.json 缺少 engines.node')
  if (!pkg.peerDependencies?.['@deepseek-ai/dsh-skill']) fail('缺少 peerDependencies @deepseek-ai/dsh-skill')
  if (!pkg.devDependencies?.['@deepseek-ai/dsh-skill']) fail('缺少 devDependencies @deepseek-ai/dsh-skill')
  for (const key of ['name', 'version', 'description']) {
    if (!pkg[key]) fail(`package.json 缺少 ${key}`)
  }
  for (const relative of ['lib', 'skills', 'cordis.patch.yml', 'locale', 'icon.svg', 'templates']) {
    if (!Array.isArray(pkg.files) || !pkg.files.includes(relative)) {
      fail(`package.json files 未包含 ${relative}`)
    }
  }
  for (const relative of ['.', './package.json', './cordis.patch.yml']) {
    if (!pkg.exports?.[relative]) fail(`package.json exports 缺少 ${relative}`)
  }
} catch (error) {
  fail(`package.json 无法解析：${error.message}`)
}

const patch = read('cordis.patch.yml')
if (!/id:\s*cpp-workflow\b/.test(patch)) fail('cordis.patch.yml 缺少 id: cpp-workflow')
if (!/name:\s*dsh-cpp-workflow\b/.test(patch)) fail('cordis.patch.yml 缺少 name: dsh-cpp-workflow')

for (const locale of ['zh', 'en']) {
  try {
    const data = JSON.parse(read(`locale/${locale}.json`))
    if (!data.meta?.title) fail(`locale/${locale}.json 缺少 meta.title`)
    if (!data.meta?.description) fail(`locale/${locale}.json 缺少 meta.description`)
  } catch (error) {
    fail(`locale/${locale}.json 无法解析：${error.message}`)
  }
}

const icon = read('icon.svg')
if (!icon.trimStart().startsWith('<svg')) fail('icon.svg 不是 SVG')
if (Buffer.byteLength(icon, 'utf8') > 256 * 1024) fail('icon.svg 超过 256 KiB')

const skillNames = new Set()
if (existsSync(path.join(root, 'skills'))) {
  for (const entry of readdirSync(path.join(root, 'skills'), { withFileTypes: true })) {
    if (entry.isDirectory()) skillNames.add(entry.name)
  }
}
for (const name of skillNames) {
  if (!Object.hasOwn(expected, name)) fail(`skills/ 下有多余目录：${name}`)
}

for (const warning of warnings) process.stdout.write(`警告：${warning}\n`)
if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`错误：${error}\n`)
  process.stderr.write(`\n结构检查失败：${errors.length} 项。\n`)
  process.exitCode = 1
} else {
  process.stdout.write('结构检查通过。\n')
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      yield* walk(target)
    } else if (entry.isFile()) {
      yield target
    }
  }
}
