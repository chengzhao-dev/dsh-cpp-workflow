#!/usr/bin/env node
// 把服务端策略与服务端/客户端共用的标签规则拼进一个 Cordis 客户端包。
//
// `tsc` 只编译 `src/**/*.ts` 到 `lib/`；客户端半侧必须是恰好一行
// `window.__ModuleLoader__.load({...})` 的 CJS 工厂（宿主按包名装载），
// 所以这里手写外壳，把 `src/comment-policy.ts`（编译后为 `lib/comment-policy.js`）的函数体内联进去，
// 保证设置页预览、服务端快照与检查器参数永远来自同一份规则。
//
// 用法：node scripts/building-client.mjs [--check]
//   --check 只校验产物是否与输入一致，不写文件（CI 用）。
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const POLICY = path.join(ROOT, 'lib', 'comment-policy.js')
const CLIENT = path.join(ROOT, 'src', 'client')
// 分片按依赖顺序拼接；同一工厂作用域里共享 React、h、PACKAGE_NAME 与策略内联常量。
const PARTS = ['shell.js', 'text.js', 'styles.js', 'widgets.js', 'form-state.js', 'app.cjs.js']
const OUT = path.join(ROOT, 'lib', 'client.js')
const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'

/** 去掉策略文件的导出语法，只保留声明与函数，供工厂内联。 */
function policyBody(source) {
  const cut = source.lastIndexOf('module.exports')
  const body = cut === -1 ? source : source.slice(0, cut)
  return body
    .replace(/^export\s+/gm, '')
    .replace(/^['"]use strict['"];?\s*$/m, '')
    .trimEnd()
}

function appBody(source) {
  return source
    .replace(/^['"]use strict['"];?\s*$/m, '')
    .trimEnd()
}

function build() {
  const policy = policyBody(readFileSync(POLICY, 'utf8'))
  const app = PARTS.map((part) => appBody(readFileSync(path.join(CLIENT, part), 'utf8'))).join('\n\n')
  return [
    '// 由 scripts/building-client.mjs 生成，请改 src/comment-policy.ts 与 src/client/*.js。',
    'window.__ModuleLoader__.load({',
    `  id: ${JSON.stringify(PACKAGE_NAME)},`,
    '  factory: (require) => {',
    '    var module = { exports: {} }',
    '    var exports = module.exports',
    '',
    policy,
    '',
    app,
    '',
    '    return module.exports',
    '  },',
    '})',
    '',
  ].join('\n')
}

const check = process.argv.includes('--check')
const output = build()
if (check) {
  let current = ''
  try {
    current = readFileSync(OUT, 'utf8')
  } catch {
    current = ''
  }
  if (current !== output) {
    process.stderr.write('lib/client.js 已过期：运行 npm run build 重新生成\n')
    process.exit(1)
  }
  process.stdout.write('lib/client.js 与源一致\n')
} else {
  writeFileSync(OUT, output)
  process.stdout.write(`已写出 ${path.relative(ROOT, OUT)}（${output.length} 字节）\n`)
}
