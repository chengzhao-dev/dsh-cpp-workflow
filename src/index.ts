// dsh-cpp-workflow 包入口。
//
// 把打包的三份技能注册成一个技能提供方。提供方只读，只扫描
// `skills/<name>/SKILL.md`；每份技能目录作为 resourceBase，步骤、参考页、
// 示例与资产都由安装后的包内解析。
//
// 门禁只认显式启用的工作区：会话 cwd 到 git 根的路径上必须有
// `.agents/skills/cpp-workflow-project/SKILL.md`，否则 `list()` 返回空。
// C++ 或 CMake 证据刻意不参与：刚复制的模板还没有源码，空工程也可以停在
// 构建步骤；检出之外的 C++ 示例看不到这些技能名，标记查找也不进兄弟目录。
//
// 优先级 550：低于项目级（200）与用户级（500），高于包内根（600）。项目
// 可按名字覆盖任意打包技能，不必改包；项目技能 cpp-workflow-project（200）
// 是另一个名字，与此不冲突。
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Schema from '@deepseek-ai/schemastery'
import { isCppWorkflowWorkspace } from './workspace.js'
import { normalizeConfig, snapshotText } from './comment-policy.js'

export const name = 'dsh-cpp-workflow'
export const inject = ['skills']

// 设置页保存的标签开关；字段即时生效，改配置不必重装插件。
// 每个文件头标签各建一个对象：四个标签共用一个 Schema 实例时，volatile 叶子会撞在同一条路径上，
// 保存 @author 会被宿主拒绝或写到别的标签。
function headerTag() {
  return Schema.object({
    enabled: Schema.boolean().default(true).volatile(),
    value: Schema.string().default('').volatile(),
  })
}

export const Config = Schema.object({
  // 声明注释符号：`///` 或 Doxygen 块注释；缺省值由 comment-policy 兜底。
  commentStyle: Schema.string().default('slash').volatile(),
  brief: Schema.object({
    enabled: Schema.boolean().default(true).volatile(),
    value: Schema.string().default('').volatile(),
  }),
  author: headerTag(),
  date: headerTag(),
  copyright: headerTag(),
  version: headerTag(),
  param: Schema.boolean().default(true).volatile(),
  returns: Schema.boolean().default(true).volatile(),
  throws: Schema.boolean().default(true).volatile(),
  note: Schema.boolean().default(true).volatile(),
  see: Schema.boolean().default(true).volatile(),
  pre: Schema.boolean().default(true).volatile(),
  post: Schema.boolean().default(true).volatile(),
  tparam: Schema.boolean().default(true).volatile(),
  retval: Schema.boolean().default(true).volatile(),
})

const PROVIDER = 'dsh-cpp-workflow'
const RANK = 550
const KNOWN_SKILLS = new Set(['building-cpp', 'engineering', 'developing-cpp'])
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SKILLS_ROOT = path.join(PACKAGE_ROOT, 'skills')

interface SkillCandidate {
  name: string
  description: string
  whenToUse?: string
  invocation: { modelInvocable: boolean; userInvocable: boolean }
  source: string
  provider: string
  rank: number
  locator: string
  resourceBase: { kind: 'directory'; path: string }
  path: string
  metadata?: Record<string, unknown>
}

interface ListOptions {
  cwd?: string
  signal?: AbortSignal
}

type SkillObservation = { candidates: SkillCandidate[]; complete: boolean }
type ListResult = SkillCandidate[] | SkillObservation

interface SkillProvider {
  name: string
  list: (options?: ListOptions) => Promise<ListResult>
  get: (candidate: SkillCandidate | undefined, options?: ListOptions) => Promise<unknown>
}

interface DshContext {
  skills: {
    registerProvider: (factory: () => SkillProvider) => unknown
  }
}

/** 读取 SKILL.md 用到的 YAML frontmatter；只支持这些键所需的最小语法。 */
function parseFrontmatter(source: string): { data: Record<string, unknown>; body: string } {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { data: {}, body: text }

  const data: Record<string, unknown> = {}
  const stack: Array<{ indent: number; target: Record<string, unknown> }> = [
    { indent: -1, target: data },
  ]
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '  ')
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const indent = line.length - line.trimStart().length
    const pair = /^([A-Za-z0-9_.-]+):(?:\s*(.*))?$/.exec(line.trim())
    if (!pair) continue
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    const parent = stack[stack.length - 1].target
    const key = pair[1]
    const value = (pair[2] ?? '').trim()
    if (value === '') {
      const child: Record<string, unknown> = {}
      parent[key] = child
      stack.push({ indent, target: child })
      continue
    }
    parent[key] = parseScalar(value)
  }
  return { data, body: text.slice(match[0].length) }
}

function parseScalar(value: string): unknown {
  // 块标量、锚点与别名需要多行语法；本包只支持单行 frontmatter，遇到这些标记
  // 直接判为不可解析，避免把 ">" 或 "|" 当成正文展示。
  if (/^[>|&*]/.test(value)) return undefined
  if (!value.startsWith('"') && !value.startsWith("'")) value = value.replace(/\s+#.*$/, '')
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const quote = value[0]
    const inner = value.slice(1, -1)
    return quote === '"'
      ? inner.replace(/\\"/g, '"').replace(/\\n/g, '\n')
      : inner.replace(/''/g, "'")
  }
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null' || value === '~') return null
  if (/^\[.*\]$/.test(value)) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => parseScalar(item.trim()))
      .filter((item) => item !== '')
  }
  return value
}

async function readCandidate(skillDir: string): Promise<{ candidate?: SkillCandidate; complete: boolean }> {
  const skillFile = path.join(skillDir, 'SKILL.md')
  let source: string
  try {
    source = await readFile(skillFile, 'utf8')
  } catch {
    // 读不到正文是瞬时 IO 问题，不能把目录当成「已完整扫描」。
    return { complete: false }
  }
  const { data } = parseFrontmatter(source)
  if (typeof data.name !== 'string' || !SKILL_NAME_RE.test(data.name)) return { complete: true }
  if (!KNOWN_SKILLS.has(data.name)) return { complete: true }
  if (typeof data.description !== 'string') return { complete: true }
  const description = data.description.replace(/\s+/g, ' ').trim()
  if (description === '') return { complete: true }
  if (data.name !== path.basename(skillDir)) return { complete: true }

  const candidate: SkillCandidate = {
    name: data.name,
    description,
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'bundled',
    provider: PROVIDER,
    rank: RANK,
    locator: skillDir,
    resourceBase: { kind: 'directory', path: skillDir },
    path: skillFile,
  }
  if (typeof data.whenToUse === 'string' && data.whenToUse.trim()) {
    candidate.whenToUse = data.whenToUse.trim()
  }
  if (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)) {
    candidate.metadata = data.metadata as Record<string, unknown>
  }
  return { candidate, complete: true }
}

async function listSkills(options: ListOptions = {}): Promise<ListResult> {
  if (options.signal?.aborted) return []
  if (!(await isCppWorkflowWorkspace(options.cwd))) return []
  if (options.signal?.aborted) return []
  let entries
  try {
    entries = await readdir(SKILLS_ROOT, { withFileTypes: true })
  } catch {
    // 目录暂时读不到时返回不完整观察，宿主不会把它当成完整空目录缓存。
    return { candidates: [], complete: false }
  }
  const candidates: SkillCandidate[] = []
  let complete = true
  for (const entry of entries) {
    if (!entry.isDirectory() || !KNOWN_SKILLS.has(entry.name)) continue
    if (options.signal?.aborted) return []
    const result = await readCandidate(path.join(SKILLS_ROOT, entry.name))
    if (result.candidate) candidates.push(result.candidate)
    if (!result.complete) complete = false
  }
  candidates.sort((a, b) => a.name.localeCompare(b.name))
  return complete ? candidates : { candidates, complete: false }
}

async function getSkill(
  candidate: SkillCandidate | undefined,
  options: ListOptions = {},
  commentConfig: unknown = undefined,
) {
  if (options.signal?.aborted) return undefined
  if (!candidate || candidate.provider !== PROVIDER) return undefined
  // candidate 可能比同一会话中的目录变化活得久。只有调用方传了 cwd 时才重查门禁；
  // 不带 cwd 的 get() 继续服务本工作区已发现的 candidate。
  if (options.cwd !== undefined && !(await isCppWorkflowWorkspace(options.cwd))) return undefined
  if (!KNOWN_SKILLS.has(candidate.name)) return undefined
  const skillDir = candidate.locator
  if (typeof skillDir !== 'string') return undefined
  const resolved = path.resolve(skillDir)
  if (resolved !== SKILLS_ROOT && !resolved.startsWith(SKILLS_ROOT + path.sep)) return undefined
  if (path.basename(resolved) !== candidate.name) return undefined

  let source: string
  try {
    source = await readFile(path.join(resolved, 'SKILL.md'), 'utf8')
  } catch {
    return undefined
  }
  const { data, body } = parseFrontmatter(source)
  if (data.name !== candidate.name) return undefined

  return {
    name: candidate.name,
    description: candidate.description,
    ...(candidate.whenToUse ? { whenToUse: candidate.whenToUse } : {}),
    invocation: candidate.invocation,
    source: candidate.source,
    provider: PROVIDER,
    resourceBase: { kind: 'directory', path: resolved },
    path: path.join(resolved, 'SKILL.md'),
    ...(candidate.metadata ? { metadata: candidate.metadata } : {}),
    // 标签开关只跟注释技能有关，另两个技能的正文保持原样。
    content:
      candidate.name === 'developing-cpp'
        ? `${body.trim()}\n\n${snapshotText(commentConfig)}`
        : body.trim(),
  }
}

export function apply(ctx: DshContext, config: unknown = undefined): void {
  // 配置对象由宿主在 volatile 保存时原地更新，所以每次 get() 都重新读取，
  // 不能在这里缓存成一份快照，否则设置页改了标签开关，技能正文仍是旧值。
  ctx.skills.registerProvider(() => ({
    name: PROVIDER,
    list: listSkills,
    get: (candidate: SkillCandidate | undefined, options?: ListOptions) =>
      getSkill(candidate, options, normalizeConfig(config)),
  }))
}
