import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, '..', 'skills', 'building-cpp', 'scripts', 'checking-encoding.mjs')

function workspace(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'dsh-encoding-'))
  spawnSync('git', ['init', '-q'], { cwd: root })
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root })
  spawnSync('git', ['config', 'user.name', 'test'], { cwd: root })
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(root, name), content)
  }
  spawnSync('git', ['add', '-A'], { cwd: root })
  return root
}

function run(root, ...args) {
  return spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' })
}

test('portable 接受 UTF-8 无 BOM 与 LF', () => {
  const root = workspace({ 'a.md': '中文 English\n', 'b.cpp': 'int main() {}\n' })
  try {
    const result = run(root)
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.match(result.stdout, /未发现问题/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('portable 拒绝 BOM 与 CRLF', () => {
  const root = workspace({ 'a.md': Buffer.from('\uFEFF中文\r\n') })
  try {
    const result = run(root)
    assert.equal(result.status, 1)
    assert.match(result.stdout, /a\.md/)
    assert.match(result.stdout, /\[bom\]/)
    assert.match(result.stdout, /\[eol\]/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('msvc 允许 C++ 源码的 UTF-8 BOM 与 CRLF，但 Markdown 仍须 LF', () => {
  const root = workspace({
    'a.cpp': Buffer.from('\uFEFFint main() {}\r\n'),
    'b.md': '中文\r\n',
  })
  try {
    const result = run(root, '--profile', 'msvc')
    assert.equal(result.status, 1)
    assert.match(result.stdout, /b\.md/)
    assert.doesNotMatch(result.stdout, /a\.cpp/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('bat 必须 CRLF，LF 报错', () => {
  const root = workspace({ 'run.bat': '@echo off\n' })
  try {
    const result = run(root)
    assert.equal(result.status, 1)
    assert.match(result.stdout, /run\.bat.*\[eol\]/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('非法 UTF-8 报错', () => {
  const root = workspace({ 'bad.txt': Buffer.from([0x66, 0x80, 0x0a]) })
  try {
    const result = run(root)
    assert.equal(result.status, 1)
    assert.match(result.stdout, /bad\.txt.*\[utf8\]/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
