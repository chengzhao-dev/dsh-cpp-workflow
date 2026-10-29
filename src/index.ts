// dsh-cpp-workflow bundle entry.
//
// Registers the three packaged skills as one bundle-scoped skill provider. The
// provider is read-only and scans only `skills/<name>/SKILL.md`; each skill
// directory becomes the resourceBase so relative steps, references, examples
// and assets resolve from the installed package.
//
// The provider scopes itself to opted-in workspaces: `list()` returns nothing
// unless the session cwd sits inside a git checkout that carries the explicit
// `.agents/skills/cpp-workflow-project/SKILL.md` marker on the path to the git
// root. C++ or CMake evidence is intentionally not part of the gate: a freshly
// copied template has no sources yet, and an empty project legitimately stops
// at the build step. A C++ sample outside an opted-in checkout never sees these
// names; the marker lookup ignores sibling directories.
//
// Rank 550 is lower priority than project/user skills (project `.agents/skills`
// 200, user `.agents/skills` 500) and higher priority than the bundled root
// (600), so a project can override any packaged skill by name without editing
// the package. The project skill itself (cpp-workflow-project, rank 200) is a
// separate name and does not collide.
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
const KNOWN_SKILLS = new Set(['building-cpp', 'configuring-cmake', 'developing-cpp'])
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

interface SkillProvider {
  name: string
  list: (options?: ListOptions) => Promise<SkillCandidate[]>
  get: (candidate: SkillCandidate | undefined, options?: ListOptions) => Promise<unknown>
}

interface DshContext {
  skills: {
    registerProvider: (factory: () => SkillProvider) => unknown
  }
}

/** Minimal YAML frontmatter reader for the keys SKILL.md actually uses. */
function parseFrontmatter(source: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) return { data: {}, body: source }

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
  return { data, body: source.slice(match[0].length) }
}

function parseScalar(value: string): unknown {
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

async function readCandidate(skillDir: string): Promise<SkillCandidate | undefined> {
  const skillFile = path.join(skillDir, 'SKILL.md')
  let source: string
  try {
    source = await readFile(skillFile, 'utf8')
  } catch {
    return undefined
  }
  const { data } = parseFrontmatter(source)
  if (typeof data.name !== 'string' || !SKILL_NAME_RE.test(data.name)) return undefined
  if (!KNOWN_SKILLS.has(data.name)) return undefined
  if (typeof data.description !== 'string' || data.description.trim() === '') return undefined
  if (data.name !== path.basename(skillDir)) return undefined

  const candidate: SkillCandidate = {
    name: data.name,
    description: data.description.trim(),
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
  return candidate
}

async function listSkills(options: ListOptions = {}): Promise<SkillCandidate[]> {
  if (options.signal?.aborted) return []
  if (!(await isCppWorkflowWorkspace(options.cwd))) return []
  if (options.signal?.aborted) return []
  let entries
  try {
    entries = await readdir(SKILLS_ROOT, { withFileTypes: true })
  } catch {
    return []
  }
  const candidates: SkillCandidate[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !KNOWN_SKILLS.has(entry.name)) continue
    if (options.signal?.aborted) return []
    const candidate = await readCandidate(path.join(SKILLS_ROOT, entry.name))
    if (candidate) candidates.push(candidate)
  }
  candidates.sort((a, b) => a.name.localeCompare(b.name))
  return candidates
}

async function getSkill(
  candidate: SkillCandidate | undefined,
  options: ListOptions = {},
  commentConfig: unknown = undefined,
) {
  if (options.signal?.aborted) return undefined
  if (!candidate || candidate.provider !== PROVIDER) return undefined
  // A candidate can outlive a directory change in the same session. Re-check
  // only when the caller supplies a cwd; a plain `get()` keeps working for
  // candidates that were already discovered in this workspace.
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
