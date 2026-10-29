// 锁定设置页的标签策略：默认预览、隐私标签、文件名跟随、检查器参数与技能快照。
// 规则改动时同步 references/comments.md 与设置页文案。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_CONFIG,
  TAG_LABEL,
  checkerArgs,
  normalizeConfig,
  previewText,
  renderFileHeader,
  snapshotText,
} from '../lib/comment-policy.js'
import { Config } from '../lib/index.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('默认预览只有 @file 与 @brief', () => {
  const text = previewText(DEFAULT_CONFIG, 'board.h')
  assert.match(text, /^\/\/\/ @file board\.h$/m)
  assert.match(text, /^\/\/\/ @brief\b/m)
  assert.doesNotMatch(text, /@author|@date|@copyright|@version/)
})

test('注释符号可切到块注释', () => {
  const block = previewText({ ...DEFAULT_CONFIG, commentStyle: 'block' }, 'board.h')
  assert.match(block, /^\/\*\*$/m)
  assert.match(block, /^ \* @file board\.h$/m)
  assert.match(block, /^ \*\/$/m)
  assert.doesNotMatch(block, /^\/\/\//m)
})

test('隐私标签默认关闭，填了非空值才写出', () => {
  const off = previewText(DEFAULT_CONFIG, 'board.h')
  assert.doesNotMatch(off, /@author/)
  const enabled = previewText(
    { ...DEFAULT_CONFIG, author: { enabled: true, value: '' } },
    'board.h',
  )
  assert.doesNotMatch(enabled, /@author/)
  const filled = previewText(
    { ...DEFAULT_CONFIG, author: { enabled: true, value: 'chengzhao-dev' } },
    'board.h',
  )
  assert.match(filled, /^\/\/\/ @author chengzhao-dev$/m)
})

test('@file 跟随示例文件名', () => {
  assert.match(previewText(DEFAULT_CONFIG, 'game.h'), /^\/\/\/ @file game\.h$/m)
  assert.match(renderFileHeader(DEFAULT_CONFIG, 'ai.cpp').join('\n'), /^\/\/\/ @file ai\.cpp$/m)
})

test('函数契约段跟随开关', () => {
  const text = previewText(DEFAULT_CONFIG, 'board.h')
  assert.match(text, /@param /)
  assert.match(text, /@return /)
  const minimal = previewText({ ...DEFAULT_CONFIG, param: false, returns: false }, 'board.h')
  assert.doesNotMatch(minimal, /@param |@return /)
})

test('非法配置回落到出厂值', () => {
  const config = normalizeConfig({ brief: 'yes', param: 1, author: null, commentStyle: 'star' })
  assert.deepEqual(config.brief, DEFAULT_CONFIG.brief)
  assert.equal(config.param, true)
  assert.deepEqual(config.author, { enabled: false, value: '' })
  assert.equal(config.commentStyle, 'slash')
  assert.equal(normalizeConfig({ commentStyle: 'block' }).commentStyle, 'block')
})

test('宿主 volatile 单元按实际值读取，设置保存后技能快照跟着变', () => {
  const instance = Config({
    param: false,
    brief: { enabled: true, value: '棋盘状态' },
    author: { enabled: true, value: 'chengzhao-dev' },
  })
  const config = normalizeConfig(instance)
  assert.equal(config.param, false)
  assert.deepEqual(config.brief, { enabled: true, value: '棋盘状态' })
  assert.deepEqual(config.author, { enabled: true, value: 'chengzhao-dev' })
  assert.doesNotMatch(snapshotText(config), /@param /)
})

test('检查器只放行填了非空值的隐私标签', () => {
  assert.deepEqual(checkerArgs(DEFAULT_CONFIG), [])
  const args = checkerArgs({
    ...DEFAULT_CONFIG,
    author: { enabled: true, value: 'chengzhao-dev' },
    date: { enabled: true, value: '' },
  })
  assert.deepEqual(args, ['--allow-tag', 'author'])
  assert.deepEqual(checkerArgs({ ...DEFAULT_CONFIG, commentStyle: 'block' }), ['--comment-style', 'block'])
})

test('技能快照写出符号、开关与放行项', () => {
  const text = snapshotText({
    ...DEFAULT_CONFIG,
    commentStyle: 'block',
    author: { enabled: true, value: 'chengzhao-dev' },
    note: true,
  })
  assert.match(text, /## 当前注释配置/)
  assert.match(text, /符号：\/\*\* \.\.\. \*\//)
  assert.match(text, /@author chengzhao-dev/)
  assert.match(text, /@note/)
})

test('客户端产物内联同一份策略', () => {
  const client = readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8')
  assert.match(client, /^window\.__ModuleLoader__\.load\(\{/m)
  assert.match(client, /function previewText/)
  assert.match(client, /function checkerArgs/)
  assert.doesNotMatch(client, /^export /m)
})
