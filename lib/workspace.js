// Workspace evidence for dsh-cpp-workflow.
//
// A repository opts in only when it carries the project skill on the path from
// the session cwd up to the git root AND that repository carries first-party C++
// or CMake evidence. A stray `CMakeLists.txt`, a sample under `templates/`, or a
// CMake file above the git root is never enough. The git root is the
// repository boundary: once the marker opts the repository in, evidence is
// searched across the repository, not outside it or in a sibling checkout.
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
export const PROJECT_SKILL = path.join('.agents', 'skills', 'cpp-workflow-project', 'SKILL.md');
export const MAX_ASCENT = 64;
export const MAX_SCAN_DEPTH = 12;
export const MAX_SCAN_ENTRIES = 4000;
const SKIPPED_DIRS = new Set([
    '.git',
    'node_modules',
    'vendor',
    'third_party',
    'templates',
    'build',
    'temp',
    '.cache',
]);
export const CPP_SOURCE_EXTENSIONS = new Set([
    '.c',
    '.cc',
    '.cpp',
    '.cxx',
    '.h',
    '.hh',
    '.hpp',
    '.hxx',
]);
export const CPP_BUILD_FILES = new Set(['CMakeLists.txt']);
async function exists(target) {
    try {
        await access(target);
        return true;
    }
    catch {
        return false;
    }
}
/** Nearest enclosing git checkout, including a worktree's `.git` file. */
export async function findGitRoot(cwd) {
    if (typeof cwd !== 'string' || cwd.trim() === '')
        return undefined;
    let cursor;
    try {
        cursor = path.resolve(cwd);
    }
    catch {
        return undefined;
    }
    for (let depth = 0; depth < MAX_ASCENT; depth += 1) {
        if (await exists(path.join(cursor, '.git')))
            return cursor;
        const parent = path.dirname(cursor);
        if (parent === cursor)
            return undefined;
        cursor = parent;
    }
    return undefined;
}
/**
 * Find the nearest project-skill marker between `cwd` and the git root,
 * inclusive. A marker above the git root never counts. The marker's directory
 * is also returned for diagnostics, but evidence is repository-wide.
 */
export async function findProjectSkill(cwd, gitRoot) {
    if (typeof cwd !== 'string' || cwd.trim() === '')
        return undefined;
    let cursor;
    try {
        cursor = path.resolve(cwd);
    }
    catch {
        return undefined;
    }
    if (!gitRoot) {
        gitRoot = await findGitRoot(cursor);
        if (!gitRoot)
            return undefined;
    }
    else {
        gitRoot = path.resolve(gitRoot);
        const relative = path.relative(gitRoot, cursor);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
            return undefined;
        }
    }
    for (let depth = 0; depth < MAX_ASCENT; depth += 1) {
        const file = path.join(cursor, PROJECT_SKILL);
        if (await exists(file))
            return { file, root: cursor };
        if (cursor === gitRoot)
            return undefined;
        const parent = path.dirname(cursor);
        if (parent === cursor)
            return undefined;
        cursor = parent;
    }
    return undefined;
}
/** Boolean form of {@link findProjectSkill}. */
export async function hasProjectSkill(cwd, gitRoot) {
    return (await findProjectSkill(cwd, gitRoot)) !== undefined;
}
/**
 * True when `root` contains at least one first-party `CMakeLists.txt` or C++
 * source/header. Generated, dependency, template and build trees are skipped.
 * The scan is bounded to 12 levels and 4000 directory entries.
 */
export async function hasCppProject(root) {
    let seen = 0;
    const queue = [{ dir: root, depth: 0 }];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current)
            break;
        let entries;
        try {
            entries = await readdir(current.dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            seen += 1;
            if (seen > MAX_SCAN_ENTRIES)
                return false;
            if (entry.isSymbolicLink())
                continue;
            if (entry.isDirectory()) {
                if (current.depth >= MAX_SCAN_DEPTH)
                    continue;
                if (SKIPPED_DIRS.has(entry.name))
                    continue;
                queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
                continue;
            }
            if (!entry.isFile())
                continue;
            if (CPP_BUILD_FILES.has(entry.name))
                return true;
            if (CPP_SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
                return true;
        }
    }
    return false;
}
/**
 * Session gate. Both halves are required:
 *   1. the project skill sits between `cwd` and the git root (inclusive), and
 *   2. that git repository contains first-party C++ or CMake evidence.
 * No cwd, no git checkout, a marker above the git root, a marker only in a
 * sibling directory, or a documentation-only repository returns false.
 */
export async function isCppWorkflowWorkspace(cwd) {
    const gitRoot = await findGitRoot(cwd);
    if (!gitRoot)
        return false;
    const project = await findProjectSkill(cwd, gitRoot);
    if (!project)
        return false;
    return hasCppProject(gitRoot);
}
