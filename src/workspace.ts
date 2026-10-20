// Workspace evidence for dsh-cpp-workflow.
//
// The provider must stay invisible in repositories that merely happen to contain
// one C++ sample or a stray CMake file. A workspace opts in when either the
// project skill explicitly asks for the workflow, or the enclosing git checkout
// contains both a CMake build file and a C++ translation unit/header. `_book`,
// build output, dependencies and other generated trees are never evidence.
import { access, readdir } from 'node:fs/promises'
import path from 'node:path'

export const PROJECT_SKILL = path.join('.agents', 'skills', 'cpp-workflow-project', 'SKILL.md')
export const MAX_ASCENT = 64
export const MAX_SCAN_DEPTH = 6
export const MAX_SCAN_ENTRIES = 1500

const SKIPPED_DIRS = new Set([
  '.git',
  '.hg',
  '.svn',
  '.cache',
  '.venv',
  'venv',
  'node_modules',
  'bower_components',
  'vendor',
  'third_party',
  'third-party',
  'external',
  'examples',
  'example',
  'samples',
  'sample',
  'docs',
  'doc',
  'benchmarks',
  '_deps',
  'build',
  'out',
  'dist',
  'target',
  'cmake-build-debug',
  'cmake-build-release',
  'CMakeFiles',
  '_book',
  '_site',
  '.quarto',
])

export const CPP_SOURCE_EXTENSIONS = new Set([
  '.cpp',
  '.cc',
  '.cxx',
  '.c++',
  '.hpp',
  '.hh',
  '.hxx',
  '.ixx',
  '.cppm',
  '.mpp',
])

export const CPP_BUILD_FILES = new Set(['CMakeLists.txt'])

async function exists(target: string): Promise<boolean> {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

/** Nearest enclosing git checkout, including a worktree's `.git` file. */
export async function findGitRoot(cwd: string | undefined): Promise<string | undefined> {
  if (typeof cwd !== 'string' || cwd.trim() === '') return undefined
  let cursor: string
  try {
    cursor = path.resolve(cwd)
  } catch {
    return undefined
  }
  for (let depth = 0; depth < MAX_ASCENT; depth += 1) {
    if (await exists(path.join(cursor, '.git'))) return cursor
    const parent = path.dirname(cursor)
    if (parent === cursor) return undefined
    cursor = parent
  }
  return undefined
}

/**
 * The explicit opt-in marker is authoritative: a project that carries a
 * cpp-workflow-project skill may use the bundle even while its CMake files are
 * being bootstrapped. The marker above the git root never counts.
 */
export async function hasProjectSkill(
  cwd: string | undefined,
  gitRoot?: string,
): Promise<boolean> {
  if (typeof cwd !== 'string' || cwd.trim() === '') return false
  let cursor: string
  try {
    cursor = path.resolve(cwd)
  } catch {
    return false
  }
  if (!gitRoot) {
    gitRoot = await findGitRoot(cursor)
    if (!gitRoot) return false
  }
  for (let depth = 0; depth < MAX_ASCENT; depth += 1) {
    if (await exists(path.join(cursor, PROJECT_SKILL))) return true
    if (cursor === gitRoot) return false
    const parent = path.dirname(cursor)
    if (parent === cursor) return false
    cursor = parent
  }
  return false
}

/**
 * True when `root` (or a bounded descendant) contains both `CMakeLists.txt`
 * and a C++ source/header file. The two halves may live in different
 * subprojects, which is common in a monorepo, so the scan keeps looking until
 * both are found or the entry budget runs out.
 */
export async function hasCppProject(root: string): Promise<boolean> {
  let cmake = false
  let source = false
  let seen = 0
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    let entries
    try {
      entries = await readdir(current.dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      seen += 1
      if (seen > MAX_SCAN_ENTRIES) return false
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        if (current.depth >= MAX_SCAN_DEPTH) continue
        if (SKIPPED_DIRS.has(entry.name)) continue
        if (entry.name.startsWith('cmake-build-')) continue
        queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 })
        continue
      }
      if (!entry.isFile()) continue
      if (CPP_BUILD_FILES.has(entry.name)) cmake = true
      else if (CPP_SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) source = true
      if (cmake && source) return true
    }
  }
  return false
}

/**
 * Session gate. `cwd` must sit in a git checkout, and that checkout must either
 * carry the explicit project skill or contain a real CMake + C++ source layout.
 * A CMake file alone, a Markdown-only repository, or a C++ sample above the git
 * root is not enough.
 */
export async function isCppWorkflowWorkspace(cwd: string | undefined): Promise<boolean> {
  const gitRoot = await findGitRoot(cwd)
  if (!gitRoot) return false
  if (await hasProjectSkill(cwd, gitRoot)) return true
  return hasCppProject(gitRoot)
}
