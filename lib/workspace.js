// dsh-cpp-workflow 的工作区判定。
//
// 仓库只有在「cwd 到 git 根的路径上带着项目技能」时才视为主动启用。标记文件
// 就是启用声明；C++ 或 CMake 证据刻意不参与，刚复制的模板照样能看到工作流。
// git 根是仓库边界：标记查找不进兄弟目录，也不向根之上继续。
import { access } from 'node:fs/promises';
import path from 'node:path';
export const PROJECT_SKILL = path.join('.agents', 'skills', 'cpp-workflow-project', 'SKILL.md');
export const MAX_ASCENT = 64;
async function exists(target) {
    try {
        await access(target);
        return true;
    }
    catch {
        return false;
    }
}
/** 最近的上级 git 检出；worktree 的 `.git` 文件也算。 */
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
 * 在 `cwd` 与 git 根之间（含两端）找最近的项目技能标记；根之上的标记不算。
 * 同时返回标记所在目录供诊断，它不是仓库边界。
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
/**
 * 会话门禁：项目技能必须位于 `cwd` 与 git 根之间（含两端）。不要求 C++ 或
 * CMake 证据：刚复制的模板仍需要工作流，空工程也可以合法地停在构建步骤。
 *
 * 没有 cwd、不在 git 检出内、标记只在 git 根之上或只在兄弟目录时返回 false。
 */
export async function isCppWorkflowWorkspace(cwd) {
    const gitRoot = await findGitRoot(cwd);
    if (!gitRoot)
        return false;
    const project = await findProjectSkill(cwd, gitRoot);
    return project !== undefined;
}
