// Workspace evidence for dsh-cpp-workflow.
//
// A repository opts in only when it carries the project skill on the path from
// the session cwd up to the git root. The marker is the opt-in declaration;
// first-party C++ or CMake evidence is deliberately not part of the gate, so a
// freshly copied template still sees the workflow. The git root is the
// repository boundary: marker lookup ignores sibling directories and never
// searches above the root.
import { access } from 'node:fs/promises';
import path from 'node:path';
export const PROJECT_SKILL = path.join('.agents', 'skills', 'cpp-workflow-project', 'SKILL.md');
export const MAX_ASCENT = 64;
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
 * is also returned for diagnostics; it is not the repository boundary.
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
 * Session gate. The project skill must sit between `cwd` and the git root
 * (inclusive). First-party C++ or CMake evidence is deliberately not required:
 * a freshly copied template still needs the workflow, and an empty project
 * legitimately stops at the build step.
 *
 * No cwd, no git checkout, a marker above the git root, or a marker only in a
 * sibling directory returns false.
 */
export async function isCppWorkflowWorkspace(cwd) {
    const gitRoot = await findGitRoot(cwd);
    if (!gitRoot)
        return false;
    const project = await findProjectSkill(cwd, gitRoot);
    return project !== undefined;
}
