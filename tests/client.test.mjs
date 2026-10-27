// 客户端半侧的冒烟测试：产物必须是恰一行 Cordis 装载调用，工厂返回带
// inject/apply 的模块，两个挂点都注册到正确的插槽，预览跟随标签开关。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const SOURCE = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'

/** 用最小的 React 桩加载客户端产物，返回工厂导出的模块。 */
function loadClient() {
  let entry
  const React = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useMemo: (factory) => factory(),
  }
  const sandbox = {
    window: { __ModuleLoader__: { load: (candidate) => { entry = candidate } } },
    navigator: { language: 'zh-CN' },
    console,
  }
  vm.runInNewContext(SOURCE, sandbox)
  assert.ok(entry, '产物没有调用 window.__ModuleLoader__.load')
  const exported = entry.factory((id) => {
    if (id === 'react') return React
    throw new Error(`unexpected require ${id}`)
  })
  return { entry, exported }
}

test('客户端产物按包名装载并只声明 slots 注入', () => {
  const { entry, exported } = loadClient()
  assert.equal(entry.id, PACKAGE_NAME)
  assert.equal(exported.name, PACKAGE_NAME)
  assert.deepEqual([...exported.inject], ['slots'])
  assert.equal(typeof exported.apply, 'function')
})

test('预览跟随标签开关', () => {
  const { exported } = loadClient()
  const defaults = exported.previewText(undefined, 'board.h')
  assert.match(defaults, /^\/\/\/ @file board\.h$/m)
  assert.match(defaults, /^\/\/\/ @brief\b/m)
  assert.doesNotMatch(defaults, /@author|@date|@copyright|@version/)

  const authored = exported.previewText(
    { author: { enabled: true, value: 'chengzhao-dev' }, brief: { enabled: true, value: '' } },
    'game.cpp',
  )
  assert.match(authored, /^\/\/\/ @file game\.cpp$/m)
  assert.match(authored, /^\/\/\/ @author chengzhao-dev$/m)
})

test('在两个插槽各注册一次，插件页的摘要视图不渲染正文', () => {
  const { exported } = loadClient()
  const registered = []
  const ctx = {
    slots: {
      inject: (name, factory) => { factory() },
      register: (meta, render) => {
        registered.push({ meta, render })
        return () => {}
      },
    },
  }
  exported.apply(ctx)
  const names = registered.map((item) => item.meta.name).sort()
  assert.deepEqual(names, ['plugins.bundle.config', 'settings.section'])
  const bundle = registered.find((item) => item.meta.name === 'plugins.bundle.config')
  assert.equal(bundle.meta.key, PACKAGE_NAME)
  assert.equal(bundle.render({ view: 'summary' }), null)
  assert.equal(registered.find((item) => item.meta.name === 'settings.section').meta.id, 'cpp-workflow')
})

test('差异操作只包含真正改动的键', () => {
  const { exported } = loadClient()
  const operations = exported.diffOperations(
    { brief: { enabled: false, value: '' }, param: true },
    { brief: { enabled: true, value: '' }, param: true },
  )
  // vm 里创建的对象原型不同，按 JSON 比较结构。
  assert.equal(
    JSON.stringify(operations),
    JSON.stringify([{ op: 'set', path: ['brief'], value: { enabled: false, value: '' } }]),
  )
})
