#!/usr/bin/env node
// GitHub Actions 工作流的结构检查。
//
// 插件的 npm 检查覆盖包与技能；这里把工作流文件也纳入同一道门禁：YAML 必须
// 能解析，每个 job 要有 runner 与 steps，每个 step 要有 `uses` 或 `run`，本地
// action 必须存在，action 引用不得漂在 main/master/latest 上。

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { parseDocument } from 'yaml'

const ROOT = process.cwd()
const WORKFLOWS = join(ROOT, '.github', 'workflows')
const failures = []

function fail(message) {
  failures.push(message)
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

if (!existsSync(WORKFLOWS)) {
  console.error('GitHub workflows OK: 0 files (.github/workflows 不存在)')
  process.exit(0)
}

const files = readdirSync(WORKFLOWS)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort()

for (const file of files) {
  const rel = `.github/workflows/${file}`
  const doc = parseDocument(readFileSync(join(WORKFLOWS, file), 'utf8'), {
    prettyErrors: true,
  })
  for (const error of doc.errors) {
    fail(`${rel}: YAML 解析失败：${error.message}`)
  }
  if (doc.errors.length > 0) continue

  const data = doc.toJS()
  if (!isObject(data)) {
    fail(`${rel}: 顶层必须是对象`)
    continue
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    fail(`${rel}: 缺少 name`)
  }
  if (data.on === undefined) {
    fail(`${rel}: 缺少 on`)
  }
  if (!isObject(data.jobs) || Object.keys(data.jobs).length === 0) {
    fail(`${rel}: jobs 必须是非空对象`)
    continue
  }

  for (const [jobId, job] of Object.entries(data.jobs)) {
    if (!isObject(job)) {
      fail(`${rel}: jobs.${jobId} 必须是对象`)
      continue
    }
    if (typeof job.uses === 'string') {
      if (job.uses.trim() === '') fail(`${rel}: jobs.${jobId}.uses 为空`)
      continue
    }
    if (job['runs-on'] === undefined) {
      fail(`${rel}: jobs.${jobId} 缺少 runs-on`)
    }
    if (!Array.isArray(job.steps) || job.steps.length === 0) {
      fail(`${rel}: jobs.${jobId}.steps 必须是非空数组`)
      continue
    }
    for (const [index, step] of job.steps.entries()) {
      const at = `${rel}: jobs.${jobId}.steps[${index}]`
      if (!isObject(step)) {
        fail(`${at} 必须是对象`)
        continue
      }
      const hasUses = typeof step.uses === 'string' && step.uses.trim() !== ''
      const hasRun = typeof step.run === 'string' && step.run.trim() !== ''
      if (!hasUses && !hasRun) {
        fail(`${at} 必须包含 uses 或 run`)
        continue
      }
      if (!hasUses) continue

      const uses = step.uses.trim()
      if (uses.startsWith('./')) {
        const local = resolve(ROOT, uses.slice(2))
        if (!existsSync(local)) fail(`${at}: 本地 action 不存在：${uses}`)
        continue
      }
      if (uses.startsWith('docker://')) {
        if (uses.endsWith(':latest')) fail(`${at}: docker action 不应使用 latest：${uses}`)
        continue
      }
      const match = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[^\s]+$/.exec(uses)
      if (!match) {
        fail(`${at}: action 引用格式不合法：${uses}`)
        continue
      }
      const ref = uses.slice(uses.indexOf('@') + 1)
      if (ref === 'main' || ref === 'master' || ref === 'latest') {
        fail(`${at}: action 引用不应跟随分支或 latest：${uses}`)
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure)
  console.error(`GitHub workflows failed: ${failures.length} 项`)
  process.exit(1)
}

console.log(`GitHub workflows OK: ${files.length} files`)
