// 把 src/ 编译到临时目录，再与仓库里的 lib/ 逐文件比较。
// 这样未提交的 lib 也能通过；不一致说明 lib 过期，需要重新构建。
import { spawnSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')

async function filesUnder(dir) {
  const out = []
  async function walk(current) {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const target = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(target)
      else if (entry.isFile()) out.push(path.relative(dir, target).split(path.sep).join('/'))
    }
  }
  await walk(dir)
  return out.sort()
}

let temp
try {
  temp = await mkdtemp(path.join(tmpdir(), 'dsh-cpp-lib-'))
  const build = spawnSync(process.execPath, [tsc, '-p', 'tsconfig.json', '--outDir', temp], {
    cwd: root,
    encoding: 'utf8',
  })
  if (build.status !== 0) {
    process.stderr.write(build.stdout || '')
    process.stderr.write(build.stderr || '')
    console.error('check:lib 失败：TypeScript 编译没有通过。')
    process.exit(1)
  }

  const built = await filesUnder(temp)
  const shipped = await filesUnder(path.join(root, 'lib'))
  const problems = []
  for (const file of built) {
    let actual
    try {
      actual = await readFile(path.join(root, 'lib', file))
    } catch {
      problems.push(`缺少 ${file}`)
      continue
    }
    const expected = await readFile(path.join(temp, file))
    if (!actual.equals(expected)) problems.push(`内容不一致 ${file}`)
  }
  // lib/client.js 由 scripts/building-client.mjs 生成，不归 tsc 管；
  // 它的一致性由 npm test 里的 `building-client.mjs --check` 负责。
  const GENERATED = new Set(['client.js'])
  for (const file of shipped) {
    if (!built.includes(file) && !GENERATED.has(file)) problems.push(`多余 ${file}`)
  }

  if (problems.length > 0) {
    console.error('check:lib 失败：lib/ 与 src/ 不同步。')
    for (const problem of problems.slice(0, 10)) console.error(`  - ${problem}`)
    if (problems.length > 10) console.error(`  ... 另有 ${problems.length - 10} 项`)
    process.exit(1)
  }
  console.log(`check:lib 通过：lib/ 与 src/ 一致（${built.length} 个文件）。`)
} finally {
  if (temp) await rm(temp, { recursive: true, force: true })
}
