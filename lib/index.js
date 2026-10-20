// dsh-cpp-workflow bundle entry.
//
// Registers the two packaged skills as one bundle-scoped skill provider. The
// provider is read-only and scans only `skills/<name>/SKILL.md`; each skill
// directory becomes the resourceBase so relative steps, references, examples
// and assets resolve from the installed package.
//
// The provider scopes itself to C++ workflow workspaces: `list()` returns
// nothing unless the session cwd sits inside a git checkout whose ancestors
// contain `.agents/skills/cpp-workflow-project/SKILL.md`. A normal repository
// therefore never sees these two names merely because it contains C++ files.
//
// Rank 550 is lower priority than project/user skills (project `.agents/skills`
// 200, user `.agents/skills` 500) and higher priority than the bundled root
// (600), so a project can override either skill by name without editing the
// package. The project skill itself (cpp-workflow-project, rank 200) is a
// separate name and does not collide.
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const name = 'dsh-cpp-workflow';
export const inject = ['skills'];
const PROVIDER = 'dsh-cpp-workflow';
const RANK = 550;
const PROJECT_SKILL = path.join('.agents', 'skills', 'cpp-workflow-project', 'SKILL.md');
const KNOWN_SKILLS = new Set(['developing-cpp', 'building-cpp']);
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKILLS_ROOT = path.join(PACKAGE_ROOT, 'skills');
const MAX_ASCENT = 64;
async function exists(target) {
    try {
        await access(target);
        return true;
    }
    catch {
        return false;
    }
}
// Walk from the session cwd to the enclosing git root. Only an ancestor that
// is inside that checkout may opt in: a project skill above the git root, or
// an unrelated checkout reached through `..`, is not evidence.
async function hasProjectSkill(cwd) {
    if (typeof cwd !== 'string' || cwd.trim() === '')
        return false;
    let start;
    try {
        start = path.resolve(cwd);
    }
    catch {
        return false;
    }
    let gitRoot;
    let cursor = start;
    for (let depth = 0; depth < MAX_ASCENT; depth += 1) {
        if (await exists(path.join(cursor, '.git'))) {
            gitRoot = cursor;
            break;
        }
        const parent = path.dirname(cursor);
        if (parent === cursor)
            break;
        cursor = parent;
    }
    if (!gitRoot)
        return false;
    cursor = start;
    for (let depth = 0; depth < MAX_ASCENT; depth += 1) {
        if (await exists(path.join(cursor, PROJECT_SKILL)))
            return true;
        if (cursor === gitRoot)
            return false;
        const parent = path.dirname(cursor);
        if (parent === cursor)
            return false;
        cursor = parent;
    }
    return false;
}
/** Minimal YAML frontmatter reader for the keys SKILL.md actually uses. */
function parseFrontmatter(source) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
    if (!match)
        return { data: {}, body: source };
    const data = {};
    const stack = [
        { indent: -1, target: data },
    ];
    for (const rawLine of match[1].split(/\r?\n/)) {
        const line = rawLine.replace(/\t/g, '  ');
        if (!line.trim() || line.trimStart().startsWith('#'))
            continue;
        const indent = line.length - line.trimStart().length;
        const pair = /^([A-Za-z0-9_.-]+):(?:\s*(.*))?$/.exec(line.trim());
        if (!pair)
            continue;
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent)
            stack.pop();
        const parent = stack[stack.length - 1].target;
        const key = pair[1];
        const value = (pair[2] ?? '').trim();
        if (value === '') {
            const child = {};
            parent[key] = child;
            stack.push({ indent, target: child });
            continue;
        }
        parent[key] = parseScalar(value);
    }
    return { data, body: source.slice(match[0].length) };
}
function parseScalar(value) {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        const quote = value[0];
        const inner = value.slice(1, -1);
        return quote === '"'
            ? inner.replace(/\\"/g, '"').replace(/\\n/g, '\n')
            : inner.replace(/''/g, "'");
    }
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    if (value === 'null' || value === '~')
        return null;
    if (/^\[.*\]$/.test(value)) {
        return value
            .slice(1, -1)
            .split(',')
            .map((item) => parseScalar(item.trim()))
            .filter((item) => item !== '');
    }
    return value;
}
async function readCandidate(skillDir) {
    const skillFile = path.join(skillDir, 'SKILL.md');
    let source;
    try {
        source = await readFile(skillFile, 'utf8');
    }
    catch {
        return undefined;
    }
    const { data } = parseFrontmatter(source);
    if (typeof data.name !== 'string' || !SKILL_NAME_RE.test(data.name))
        return undefined;
    if (!KNOWN_SKILLS.has(data.name))
        return undefined;
    if (typeof data.description !== 'string' || data.description.trim() === '')
        return undefined;
    if (data.name !== path.basename(skillDir))
        return undefined;
    const candidate = {
        name: data.name,
        description: data.description.trim(),
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'bundled',
        provider: PROVIDER,
        rank: RANK,
        locator: skillDir,
        resourceBase: { kind: 'directory', path: skillDir },
        path: skillFile,
    };
    if (typeof data.whenToUse === 'string' && data.whenToUse.trim()) {
        candidate.whenToUse = data.whenToUse.trim();
    }
    if (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)) {
        candidate.metadata = data.metadata;
    }
    return candidate;
}
async function listSkills(options = {}) {
    if (options.signal?.aborted)
        return [];
    if (!(await hasProjectSkill(options.cwd)))
        return [];
    if (options.signal?.aborted)
        return [];
    let entries;
    try {
        entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const candidates = [];
    for (const entry of entries) {
        if (!entry.isDirectory() || !KNOWN_SKILLS.has(entry.name))
            continue;
        if (options.signal?.aborted)
            return [];
        const candidate = await readCandidate(path.join(SKILLS_ROOT, entry.name));
        if (candidate)
            candidates.push(candidate);
    }
    candidates.sort((a, b) => a.name.localeCompare(b.name));
    return candidates;
}
async function getSkill(candidate, options = {}) {
    if (options.signal?.aborted)
        return undefined;
    if (!candidate || candidate.provider !== PROVIDER)
        return undefined;
    if (!KNOWN_SKILLS.has(candidate.name))
        return undefined;
    const skillDir = candidate.locator;
    if (typeof skillDir !== 'string')
        return undefined;
    const resolved = path.resolve(skillDir);
    if (resolved !== SKILLS_ROOT && !resolved.startsWith(SKILLS_ROOT + path.sep))
        return undefined;
    if (path.basename(resolved) !== candidate.name)
        return undefined;
    let source;
    try {
        source = await readFile(path.join(resolved, 'SKILL.md'), 'utf8');
    }
    catch {
        return undefined;
    }
    const { data, body } = parseFrontmatter(source);
    if (data.name !== candidate.name)
        return undefined;
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
        content: body.trim(),
    };
}
export function apply(ctx) {
    ctx.skills.registerProvider(() => ({
        name: PROVIDER,
        list: listSkills,
        get: getSkill,
    }));
}
