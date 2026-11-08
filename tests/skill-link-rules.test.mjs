// 包闭包边界：打包文档只能链接到 npm 会发布的路径。这些用例钉住路径分隔符
// 边界——只写 `startsWith('skills')` 的检查会漏掉它。
import assert from 'node:assert/strict'
import test from 'node:test'
import { isPackagedPath } from '../scripts/skill-link-rules.mjs'

const FILES = ['skills', 'templates', 'README.md', 'LICENSE']

test('exact packaged file matches', () => {
  assert.equal(isPackagedPath('README.md', FILES), true)
  assert.equal(isPackagedPath('LICENSE', FILES), true)
})

test('a packaged directory covers its subtree', () => {
  assert.equal(isPackagedPath('skills/developing-cpp/SKILL.md', FILES), true)
  assert.equal(isPackagedPath('templates/cpp-workflow-project/SKILL.md', FILES), true)
})

test('development-only paths do not match', () => {
  assert.equal(isPackagedPath('scripts/checking-skill-links.mjs', FILES), false)
  assert.equal(isPackagedPath('docs/architecture.md', FILES), false)
  assert.equal(isPackagedPath('tests/skill-link-rules.test.mjs', FILES), false)
})

test('directory matching stops at a path separator', () => {
  assert.equal(isPackagedPath('skills-extra/SKILL.md', FILES), false)
  assert.equal(isPackagedPath('templates-old/file.md', FILES), false)
})

test('windows separators and leading ./ are normalized', () => {
  assert.equal(isPackagedPath('.\\skills\\developing-cpp\\SKILL.md', FILES), true)
  assert.equal(isPackagedPath('./README.md', FILES), true)
})
