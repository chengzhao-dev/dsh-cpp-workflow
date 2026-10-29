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

function collect(node, predicate, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out
  if (Array.isArray(node)) {
    for (const child of node) collect(child, predicate, out)
    return out
  }
  if (typeof node !== 'object') return out
  if (predicate(node)) out.push(node)
  const children = node.props && node.props.children
  if (children !== undefined) collect(children, predicate, out)
  if (typeof node.type === 'function') collect(node.type(node.props || {}), predicate, out)
  return out
}

test('客户端半侧用包名挂在 Cordis Loader 上并只依赖 react', () => {
  const { id, exported } = loadClient()
  assert.equal(id, PACKAGE_NAME)
  assert.equal(exported.name, PACKAGE_NAME)
  assert.deepEqual(exported.inject, ['slots', 'configForms'])
  assert.equal(typeof exported.apply, 'function')
})

function readyForm(writable = true) {
  return {
    state: { status: 'ready', writable, revision: 7, value: {} },
    mutate: async () => true,
  }
}

function controllerForm(writable = true) {
  return {
    getSnapshot() {
      return { status: 'ready', writable, revision: 7, value: {} }
    },
    subscribe() {
      return () => {}
    },
    mutate: async () => true,
  }
}

test('只向插件页注册一个配置挂点，并用组合包条目 id 取表单', () => {
  const { exported } = loadClient()
  const injected = []
  const registered = []
  const requested = []
  const form = controllerForm(true)
  const ctx = {
    effect(run) {
      return run()
    },
    configForms: {
      get(entryId) {
        requested.push(entryId)
        return form
      },
      whileServed(namespaces, register) {
        assert.deepEqual(namespaces, ['cpp-workflow'])
        return register(new Set(namespaces))
      },
    },
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
  // 表单延迟到页面渲染时再取：宿主服务晚到时，挂点已存在也能接上。
  assert.deepEqual(requested, [])
  assert.deepEqual(injected, ['plugins.bundle.config'])
  assert.equal(registered[0].meta.key, PACKAGE_NAME)
  // 插件页的摘要行不占位；页面视图返回完整表单，且拿到的是可编辑表单。
  assert.equal(registered[0].render({ view: 'summary' }), null)
  const tree = registered[0].render({})
  const texts = flatten(tree)
  assert.deepEqual(requested, ['cpp-workflow'])
  assert.ok(!texts.some((text) => text.includes('暂时没有连到配置表单')))
  assert.deepEqual(texts.filter((text) => text === '文档注释'), ['文档注释'])
})

test('表单服务晚到时页面重新取表单，不再冻结只读', () => {
  const { exported } = loadClient()
  let form
  let registered
  const ctx = {
    effect(run) {
      return run()
    },
    configForms: {
      get() {
        return form
      },
      whileServed(namespaces, register) {
        return register(new Set(namespaces))
      },
    },
    slots: {
      inject(name, callback) {
        callback()
      },
      register(meta, render) {
        registered = { meta, render }
        return () => {}
      },
    },
  }
  exported.apply(ctx)
  let texts = flatten(registered.render({}))
  assert.ok(texts.some((text) => text.includes('暂时没有连到配置表单')))
  form = readyForm(true)
  texts = flatten(registered.render({}))
  assert.ok(!texts.some((text) => text.includes('暂时没有连到配置表单')))
  const switches = collect(registered.render({}), (node) => node.type === 'input' && node.props.type === 'checkbox')
  assert.ok(switches.length > 0)
  assert.ok(switches.every((node) => node.props.disabled === false))
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

test('文件头字段按叶子路径写入，避免整对象路径被宿主拒绝', () => {
  const { exported } = loadClient()
  const header = (enabled, value) => ({ enabled, value })
  const base = {
    brief: header(true, ''),
    author: header(false, ''),
    date: header(false, ''),
    copyright: header(false, ''),
    version: header(false, ''),
    param: true,
    returns: true,
    throws: true,
    note: false,
    see: false,
    pre: false,
    post: false,
    tparam: false,
    retval: false,
  }
  const draft = {
    ...base,
    brief: header(true, '棋盘状态'),
    author: header(true, 'chengzhao-dev'),
    param: false,
  }
  assert.deepEqual(exported.diffOperations(draft, base), [
    { op: 'set', path: ['brief', 'value'], value: '棋盘状态' },
    { op: 'set', path: ['author', 'enabled'], value: true },
    { op: 'set', path: ['author', 'value'], value: 'chengzhao-dev' },
    { op: 'set', path: ['param'], value: false },
  ])
})

test('出厂设置除锁定项外全部开关为开', () => {
  const { exported } = loadClient()
  const tree = exported.ConfigPage({ form: readyForm(true) })
  const switches = collect(tree, (node) => node.type === 'input' && node.props.type === 'checkbox')
  const labels = new Set(switches.map((node) => node.props['aria-label']))
  assert.equal(labels.size, 14)
  assert.ok(switches.every((node) => node.props.checked === true))
})

test('关闭文件头标签只提交开关，值留在草稿里', () => {
  const { exported } = loadClient()
  const base = { author: { enabled: true, value: 'chengzhao-dev' } }
  const draft = { author: { enabled: false, value: 'chengzhao-dev' } }
  assert.deepEqual(exported.diffOperations(draft, base), [
    { op: 'set', path: ['author', 'enabled'], value: false },
  ])
})

test('没有宿主表单时给出恢复入口，不抛异常', () => {
  const { exported } = loadClient()
  const tree = exported.ConfigPage({})
  const texts = flatten(tree)
  assert.ok(texts.includes('文档注释'))
  assert.ok(texts.some((text) => text.includes('内置默认值')))
  assert.ok(texts.some((text) => text.includes('重新载入页面')))
  assert.ok(texts.some((text) => text.includes('/// @file <文件名>')))
})

test('可写的配置快照打开编辑，不再按已移除的 mode 判成只读', () => {
  const { exported } = loadClient()
  const tree = exported.ConfigPage({ form: readyForm(true) })
  const texts = flatten(tree)
  assert.ok(!texts.some((text) => text.includes('当前账户不能修改')))
  assert.ok(!texts.some((text) => text.includes('这里显示出厂值')))
  const switches = collect(tree, (node) => node.type === 'input' && node.props.type === 'checkbox')
  assert.ok(switches.length > 0)
  assert.ok(switches.every((node) => node.props.disabled === false))
  const save = collect(
    tree,
    (node) => node.type === 'button' && flatten(node).includes('保存'),
  )
  assert.equal(save.length, 1)
  assert.equal(save[0].props.disabled, true, '没有改动时保存保持禁用')
})

test('不可写的配置快照给出账户提示，而不是可编辑表单', () => {
  const { exported } = loadClient()
  const texts = flatten(exported.ConfigPage({ form: readyForm(false) }))
  assert.ok(texts.some((text) => text.includes('当前账户不能修改')))
})

test('ConfigFormController 的 getSnapshot 快照也能打开编辑', () => {
  const { exported } = loadClient()
  const tree = exported.ConfigPage({ form: controllerForm(true) })
  const texts = flatten(tree)
  assert.ok(!texts.some((text) => text.includes('当前部署没有把可编辑配置传给这个页面')))
  assert.ok(!texts.some((text) => text.includes('当前账户不能修改')))
  const switches = collect(tree, (node) => node.type === 'input' && node.props.type === 'checkbox')
  assert.ok(switches.length > 0)
  assert.ok(switches.every((node) => node.props.disabled === false))
})
