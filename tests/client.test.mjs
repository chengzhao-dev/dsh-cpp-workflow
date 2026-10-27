// 客户端半侧的装载与挂点快照：不需要真实浏览器，也能发现包装头、
// 挂点名或组件初始化被改坏的问题。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const CLIENT = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'

// 界面文案跟随 navigator.language；测试固定中文，避免在英文机器上断言失败。
Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'zh-CN' },
  configurable: true,
})

function fakeReact() {
  return {
    createElement(type, props, ...children) {
      return { type, props: { ...props, children } }
    },
    useState(value) {
      return [typeof value === 'function' ? value() : value, () => {}]
    },
    useMemo(factory) {
      return factory()
    },
    useEffect() {},
  }
}

function loadClient() {
  const source = readFileSync(CLIENT, 'utf8')
  let exported
  let id
  const sandboxWindow = {
    __ModuleLoader__: {
      load(options) {
        id = options.id
        exported = options.factory((specifier) => {
          assert.equal(specifier, 'react', `客户端半侧只能加载 react，实际为 ${specifier}`)
          return fakeReact()
        })
      },
    },
  }
  globalThis.window = sandboxWindow
  try {
    new Function('window', 'require', source)(sandboxWindow, undefined)
  } finally {
    delete globalThis.window
  }
  return { id, exported }
}

function flatten(node, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node))
    return out
  }
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out)
    return out
  }
  const children = node.props && node.props.children
  if (children !== undefined) flatten(children, out)
  if (typeof node.type === 'function') flatten(node.type(node.props || {}), out)
  return out
}

test('客户端半侧用包名挂在 Cordis Loader 上并只依赖 react', () => {
  const { id, exported } = loadClient()
  assert.equal(id, PACKAGE_NAME)
  assert.equal(exported.name, PACKAGE_NAME)
  assert.deepEqual(exported.inject, ['slots'])
  assert.equal(typeof exported.apply, 'function')
})

test('设置页与插件页各注册一个挂点', () => {
  const { exported } = loadClient()
  const injected = []
  const registered = []
  const ctx = {
    slots: {
      inject(name, callback) {
        injected.push(name)
        callback()
      },
      register(meta, render) {
        registered.push({ meta, render })
        return () => {}
      },
    },
  }
  exported.apply(ctx)
  assert.deepEqual(injected, ['settings.section', 'plugins.bundle.config'])
  assert.equal(registered[0].meta.id, 'cpp-workflow')
  assert.equal(registered[0].meta.order, 60)
  assert.equal(typeof registered[0].meta.label, 'function')
  assert.equal(registered[1].meta.key, PACKAGE_NAME)
  // 插件页的摘要行不占位；页面视图返回完整表单。
  assert.equal(registered[1].render({ view: 'summary' }), null)
  assert.deepEqual(flatten(registered[1].render({})).filter((text) => text === '文档注释'), ['文档注释'])
})

test('出厂设置的预览先写文件头，再写函数契约', () => {
  const { exported } = loadClient()
  const lines = exported.previewText(undefined, '<文件名>').split('\n')
  assert.equal(lines[0], '/// @file <文件名>')
  // @brief 开着但没填句子时，预览用占位句，避免出现空标签。
  assert.equal(lines[1], '/// @brief <一句话说明本文件>')
  assert.ok(lines.includes('/// @param row 目标行号。'))
  assert.ok(lines.at(-1).startsWith('[[nodiscard]] bool Place('))
})

test('没有宿主表单时页面降级为只读出厂值，不抛异常', () => {
  const { exported } = loadClient()
  const tree = exported.ConfigPage({})
  const texts = flatten(tree)
  assert.ok(texts.includes('文档注释'))
  assert.ok(texts.some((text) => text.includes('出厂值')))
  assert.ok(texts.some((text) => text.includes('/// @file <文件名>')))
})
