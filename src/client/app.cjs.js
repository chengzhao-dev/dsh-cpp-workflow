'use strict'

// 客户端半侧：插件页的配置卡片（plugins.bundle.config），只此一个入口。
// 标签策略在本文件上方内联（由 scripts/building-client.mjs 从 src/comment-policy.js
// 拼进来），所以预览、默认值与服务端快照永远同源；这里只做表单与外观。
const React = require('react')
const h = React.createElement

const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'

const STRINGS = {
  zh: {
    nav: 'C++ 工程流程',
    eyebrow: '文档注释',
    title: '注释默认带哪些标签',
    intro: '这里只决定代理新写注释时的默认值。源码里已有的注释不会被改写；保存后，下一次读取技能时生效。',
    header: '文件头',
    headerHint: '每个手写源文件开头的 /// 注释块。',
    briefHint: '一句话说明这个文件定义或实现什么。留空时，每个文件自己写。',
    authorHint: '作者署名。默认不写；打开并填写后才写进文件头。',
    dateHint: '创建或最后修改日期。默认不写。',
    copyrightHint: '版权声明。默认不写。',
    versionHint: '文件版本号。默认不写。',
    paramHint: '函数参数的含义、范围或所有权。',
    returnHint: '返回值在什么条件下成立。返回类型自明时可以省略。',
    throwsHint: '抛出的异常类型与条件。不抛异常的函数不写。',
    contractHint: '函数声明的注释里必须交代的参数与失败信息。',
    extra: '更多标签',
    extraHint: '默认关闭，需要时在单个函数上补写。',
    preview: '预览',
    previewHint: '按当前开关生成，文件名用占位符表示。',
    save: '保存',
    reset: '恢复出厂值',
    saved: '已保存，下一次读取技能时生效。',
    rejected: '保存被拒绝：配置可能已在别处修改，请恢复出厂值后再试。',
    unsaved: '有未保存的改动',
    loading: '正在读取配置…',
    unavailable: '这个部署没有提供这份配置。',
    unreadable: '当前账户不能修改这份配置。',
    readOnly: '当前部署没有把可编辑配置传给这个页面，下面显示的是出厂值。',
    fixed: '跟随文件名',
    fixedHint: '值由实际文件决定，不写进配置。',
    emptyValue: '留空则由文件自己写',
    blankBrief: '留空则文件自述',
    on: '写出',
    off: '不写',
  },
  en: {
    nav: 'C++ Workflow',
    eyebrow: 'Doxygen comments',
    title: 'Which tags comments carry by default',
    intro: 'These defaults apply to comments the agent writes from now on. Existing sources are never rewritten; saving takes effect on the next skill read.',
    header: 'File header',
    headerHint: 'The /// block at the top of each hand-written source file.',
    briefHint: 'One sentence saying what the file defines or implements. Leave the value to each file.',
    authorHint: 'Author name. Off by default; written only when filled.',
    dateHint: 'Created or last modified date. Off by default.',
    copyrightHint: 'Copyright notice. Off by default.',
    versionHint: 'File version. Off by default.',
    paramHint: 'Meaning, range, or ownership of a parameter.',
    returnHint: 'When the returned value holds. Optional when the type is self-evident.',
    throwsHint: 'Exception type and condition. Omitted when the function does not throw.',
    contractHint: 'Parameters and failure information every function comment must carry.',
    extra: 'More tags',
    extraHint: 'Off by default; add them per function when needed.',
    preview: 'Preview',
    previewHint: 'Generated from the switches above; the file name is a placeholder.',
    save: 'Save',
    reset: 'Restore defaults',
    saved: 'Saved; the next skill read uses it.',
    rejected: 'The host rejected the save: the config changed elsewhere. Restore defaults and try again.',
    unsaved: 'Unsaved changes',
    loading: 'Reading configuration…',
    unavailable: 'This deployment does not serve this configuration.',
    unreadable: 'This account cannot edit the configuration.',
    readOnly: 'This deployment does not pass an editable form to this page; the values below are defaults.',
    fixed: 'Follows the file name',
    fixedHint: 'Derived from the file itself, never stored in the config.',
    emptyValue: 'Leave empty and each file writes its own',
    blankBrief: 'Leave empty for each file',
    on: 'Write',
    off: 'Omit',
  },
}

function language() {
  const value = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'zh'
  return String(value).toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function t() {
  return STRINGS[language()]
}

const STYLE_ID = 'dsh-cpp-workflow-settings'

// 外观只用宿主变量与两档中性色；没有变量时回落到浅色主题的一组合法颜色。
const CSS = `
.dcw-page{--dcw-fg:var(--dsw-alias-label-primary,#1f2328);--dcw-muted:var(--dsw-alias-label-secondary,#69707d);--dcw-faint:var(--dsw-alias-label-tertiary,#8a919c);--dcw-border:var(--dsw-alias-border-l2,rgba(31,35,40,.14));--dcw-bg1:var(--dsw-alias-bg-layer-1,#fff);--dcw-bg2:var(--dsw-alias-bg-layer-2,rgba(31,35,40,.035));--dcw-accent:var(--dsw-alias-brand-primary,#2f6fed);--dcw-danger:var(--dsw-alias-state-error-primary,#c0392b);color:var(--dcw-fg);max-width:760px;padding:2px 0 12px;font-size:13px;line-height:1.6}
.dcw-head{margin:0 0 14px}
.dcw-eyebrow{margin:0 0 4px;color:var(--dcw-muted);font-size:11.5px;letter-spacing:.02em}
.dcw-title{margin:0 0 6px;font-size:16px;font-weight:620;letter-spacing:.005em}
.dcw-lede{margin:0;color:var(--dcw-muted);font-size:12.5px;line-height:1.65;max-width:64ch}
.dcw-note{display:flex;gap:8px;align-items:center;margin:12px 0 0;padding:9px 11px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg2);color:var(--dcw-muted);font-size:12px;line-height:1.55}
.dcw-note[data-tone="warn"]{color:var(--dcw-danger);border-color:color-mix(in srgb,var(--dcw-danger) 35%,transparent)}
.dcw-note-dot{flex:none;width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.55}
.dcw-card{margin:14px 0 0;border:1px solid var(--dcw-border);border-radius:10px;background:var(--dcw-bg1);overflow:hidden}
.dcw-card-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:11px 14px 9px;border-bottom:1px solid var(--dcw-border);background:var(--dcw-bg2)}
.dcw-card-title{margin:0;font-size:12.5px;font-weight:620;letter-spacing:.01em}
.dcw-card-hint{margin:0;color:var(--dcw-muted);font-size:11.5px;line-height:1.5}
.dcw-row{display:grid;grid-template-columns:88px minmax(0,1fr);gap:2px 14px;padding:9px 14px;border-top:1px solid var(--dcw-border)}
.dcw-row:first-of-type{border-top:0}
.dcw-row-label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dcw-fg);padding-top:3px}
.dcw-row-control{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;min-width:0}
.dcw-row-hint{flex-basis:100%;margin:0;color:var(--dcw-muted);font-size:11.5px;line-height:1.55}
.dcw-row-fixed .dcw-row-control{gap:8px}
.dcw-static{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px;border:1px dashed var(--dcw-border);border-radius:6px;background:var(--dcw-bg2);color:var(--dcw-muted);font-size:12px}
.dcw-static svg{flex:none;opacity:.7}
.dcw-switch{position:relative;display:inline-flex;align-items:center;flex:none;width:34px;height:20px;cursor:pointer}
.dcw-switch input{position:absolute;inset:0;margin:0;opacity:0;cursor:pointer}
.dcw-track{position:absolute;inset:0;border-radius:999px;background:color-mix(in srgb,var(--dcw-fg) 18%,transparent);transition:background .16s ease}
.dcw-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .16s ease}
.dcw-switch input:checked + .dcw-track{background:var(--dcw-accent)}
.dcw-switch input:checked + .dcw-track .dcw-knob{transform:translateX(14px)}
.dcw-switch input:focus-visible + .dcw-track{outline:2px solid var(--dcw-accent);outline-offset:2px}
.dcw-switch input:disabled + .dcw-track{opacity:.4}
.dcw-switch input:disabled{cursor:default}
.dcw-state{color:var(--dcw-faint);font-size:11.5px;min-width:28px}
.dcw-input{flex:1 1 220px;min-width:0;height:28px;padding:0 9px;border:1px solid var(--dcw-border);border-radius:6px;background:transparent;color:var(--dcw-fg);font:inherit;font-size:12.5px}
.dcw-input::placeholder{color:var(--dcw-faint)}
.dcw-input:focus{outline:none;border-color:var(--dcw-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--dcw-accent) 18%,transparent)}
.dcw-input:disabled{background:var(--dcw-bg2);color:var(--dcw-faint)}
.dcw-flags{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 16px;padding:4px 14px 8px}
.dcw-flag{display:flex;flex-direction:column;gap:3px;padding:7px 0}
.dcw-flag .dcw-row-label{padding-top:0;display:flex;align-items:center;gap:8px;justify-content:space-between}
.dcw-card>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;cursor:pointer;list-style:none}
.dcw-card details>summary::-webkit-details-marker{display:none}
.dcw-card details>summary::marker{content:''}
.dcw-card>summary:hover{background:var(--dcw-bg2)}
.dcw-chevron{transition:transform .16s ease;color:var(--dcw-muted)}
.dcw-card[open] .dcw-chevron{transform:rotate(90deg)}
.dcw-preview{margin:0;padding:11px 14px 13px;border-top:1px solid var(--dcw-border);overflow-x:auto;background:var(--dcw-bg2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.7;white-space:pre;color:var(--dcw-fg)}
.dcw-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px;padding:11px 2px 4px;border-top:1px solid var(--dcw-border)}
.dcw-btn{height:30px;padding:0 13px;border:1px solid var(--dcw-border);border-radius:7px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;font-size:12.5px;cursor:pointer}
.dcw-btn:hover:enabled{border-color:color-mix(in srgb,var(--dcw-fg) 32%,transparent)}
.dcw-btn:focus-visible{outline:2px solid var(--dcw-accent);outline-offset:1px}
.dcw-btn:disabled{opacity:.45;cursor:default}
.dcw-btn-primary{background:var(--dcw-accent);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
.dcw-btn-primary:hover:enabled{filter:brightness(1.06)}
.dcw-status{flex:1 1 200px;margin:0;color:var(--dcw-muted);font-size:12px}
.dcw-status[data-tone="warn"]{color:var(--dcw-danger)}
.dcw-status[data-tone="ok"]{color:var(--dsw-alias-state-success-primary,#1a7f37)}
@media (max-width:640px){.dcw-row{grid-template-columns:1fr;gap:4px}.dcw-row-label{padding-top:0}.dcw-flags{grid-template-columns:1fr}.dcw-flag:nth-child(2){border-top:1px solid var(--dcw-border)}}
`

function ensureStyles() {
  if (typeof document === 'undefined' || !document.createElement) return
  if (document.querySelector && document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)) return
  const style = document.createElement('style')
  style.dataset.pluginCss = STYLE_ID
  style.textContent = CSS
  if (document.head && document.head.appendChild) document.head.appendChild(style)
}

function Switch(props) {
  return h(
    'span',
    { className: 'dcw-switch' },
    h('input', {
      type: 'checkbox',
      checked: Boolean(props.checked),
      disabled: Boolean(props.disabled),
      'aria-label': props.label,
      onChange: (event) => props.onChange(event.target.checked),
    }),
    h('span', { className: 'dcw-track' }, h('span', { className: 'dcw-knob' })),
  )
}

function LockIcon() {
  return h(
    'svg',
    { width: 12, height: 12, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', {
      fill: 'currentColor',
      d: 'M8 1a3 3 0 0 0-3 3v2H4.5A1.5 1.5 0 0 0 3 7.5v5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 6H11V4a3 3 0 0 0-3-3Zm2 5H6V4a2 2 0 1 1 4 0v2Z',
    }),
  )
}

function Chevron() {
  return h(
    'svg',
    { className: 'dcw-chevron', width: 12, height: 12, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { fill: 'currentColor', d: 'M6 3.5 10.5 8 6 12.5 4.9 11.4 8.3 8 4.9 4.6Z' }),
  )
}

const HINT_KEY = {
  brief: 'briefHint',
  author: 'authorHint',
  date: 'dateHint',
  copyright: 'copyrightHint',
  version: 'versionHint',
  param: 'paramHint',
  returns: 'returnHint',
  throws: 'throwsHint',
}

function ValueRow(props) {
  const s = props.strings
  const entry = props.entry
  return h(
    'div',
    { className: 'dcw-row' },
    h('div', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
    h(
      'div',
      { className: 'dcw-row-control' },
      h(Switch, {
        label: TAG_LABEL[props.tag],
        checked: entry.enabled,
        disabled: props.disabled,
        onChange: (enabled) => props.onChange({ ...entry, enabled }),
      }),
      h('span', { className: 'dcw-state', 'aria-hidden': 'true' }, entry.enabled ? s.on : s.off),
      h('input', {
        className: 'dcw-input',
        type: 'text',
        value: entry.value,
        placeholder: props.tag === 'brief' ? s.blankBrief : s.emptyValue,
        disabled: props.disabled || !entry.enabled,
        'aria-label': `${TAG_LABEL[props.tag]} 的值`,
        onChange: (event) => props.onChange({ ...entry, value: event.target.value }),
      }),
      h('p', { className: 'dcw-row-hint' }, s[HINT_KEY[props.tag]] || ''),
    ),
  )
}

function Flag(props) {
  return h(
    'div',
    { className: 'dcw-flag' },
    h(
      'div',
      { className: 'dcw-row-label' },
      TAG_LABEL[props.tag],
      h(Switch, {
        label: TAG_LABEL[props.tag],
        checked: props.checked,
        disabled: props.disabled,
        onChange: props.onChange,
      }),
    ),
    h('p', { className: 'dcw-row-hint' }, props.hint || ''),
  )
}

function Preview(props) {
  const s = props.strings
  return h(
    'section',
    { className: 'dcw-card', 'aria-label': s.preview },
    h(
      'div',
      { className: 'dcw-card-head' },
      h('h4', { className: 'dcw-card-title' }, s.preview),
      h('p', { className: 'dcw-card-hint' }, s.previewHint),
    ),
    h('pre', { className: 'dcw-preview' }, previewText(props.config, SAMPLE_FILE)),
  )
}

function diffOperations(draft, base) {
  const operations = []
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    const next = draft[key]
    const previous = base[key]
    if (next !== null && typeof next === 'object') {
      // 文件头字段整体不是 volatile，宿主只接受叶子路径（brief.enabled / brief.value）。
      const before = previous !== null && typeof previous === 'object' ? previous : {}
      for (const field of Object.keys(next)) {
        if (JSON.stringify(next[field]) !== JSON.stringify(before[field])) {
          operations.push({ op: 'set', path: [key, field], value: next[field] })
        }
      }
      continue
    }
    if (JSON.stringify(next) !== JSON.stringify(previous)) {
      operations.push({ op: 'set', path: [key], value: next })
    }
  }
  return operations
}

function snapshotOf(form) {
  if (!form) return { status: 'missing', writable: false }
  if (typeof form.getSnapshot === 'function') return form.getSnapshot()
  return form.state || { status: 'missing', writable: false }
}

// 宿主的 ConfigFormController 是可订阅的外部存储；旧调用方仍可能直接给 form.state。
function useFormSnapshot(form) {
  const [snapshot, setSnapshot] = React.useState(() => snapshotOf(form))
  React.useEffect(() => {
    if (!form || typeof form.subscribe !== 'function' || typeof form.getSnapshot !== 'function') {
      setSnapshot(snapshotOf(form))
      return undefined
    }
    setSnapshot(form.getSnapshot())
    return form.subscribe(() => setSnapshot(form.getSnapshot()))
  }, [form])
  return snapshot
}

function ConfigPage(props) {
  const s = t()
  ensureStyles()
  const form = props.form
  const state = useFormSnapshot(form)
  const initial = React.useMemo(() => normalizeConfig(state.value), [])
  const [draft, setDraft] = React.useState(initial)
  const [base, setBase] = React.useState(initial)
  const [dirty, setDirty] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [tone, setTone] = React.useState('')
  const revision = state.revision
  // 快照只有 status / writable / revision；旧版本多出来的 mode 字段已不存在，
  // 再按它判断会把所有可写表单误判成只读。
  const ready = Boolean(state.status === 'ready' && state.writable)
  const status = state.status

  React.useEffect(() => {
    if (dirty || state.status !== 'ready') return
    const next = normalizeConfig(state.value)
    setBase(next)
    setDraft(next)
  }, [revision, status, dirty, form, state.value])

  const update = (patch) => {
    setDraft((current) => ({ ...current, ...patch }))
    setDirty(true)
    setMessage('')
    setTone('')
  }

  const reset = () => {
    setDraft(base)
    setDirty(false)
    setMessage('')
    setTone('')
  }

  const save = async () => {
    if (!ready || busy) return
    const operations = diffOperations(draft, base)
    if (operations.length === 0) return
    setBusy(true)
    try {
      const accepted = await form.mutate(operations, revision)
      if (accepted) {
        setBase(draft)
        setDirty(false)
        setMessage(s.saved)
        setTone('ok')
      } else {
        setMessage(s.rejected)
        setTone('warn')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
      setTone('warn')
    } finally {
      setBusy(false)
    }
  }

  const editable = Boolean(form)
  const disabled = !ready

  return h(
    'div',
    { className: 'dcw-page' },
    h(
      'header',
      { className: 'dcw-head' },
      h('p', { className: 'dcw-eyebrow' }, s.eyebrow),
      h('h3', { className: 'dcw-title' }, s.title),
      h('p', { className: 'dcw-lede' }, s.intro),
    ),
    !editable
      ? h(
          'div',
          { className: 'dcw-note', role: 'status' },
          h('span', { className: 'dcw-note-dot' }),
          h('span', null, s.readOnly),
        )
      : null,
    editable && !ready && status !== 'missing'
      ? h(
          'div',
          { className: 'dcw-note', role: 'status' },
          h('span', { className: 'dcw-note-dot' }),
          h('span', null, status === 'loading' ? s.loading : status === 'unavailable' ? s.unavailable : s.unreadable),
        )
      : null,
    h(
      'section',
      { className: 'dcw-card', 'aria-labelledby': 'dcw-header-title' },
      h(
        'div',
        { className: 'dcw-card-head' },
        h('h4', { className: 'dcw-card-title', id: 'dcw-header-title' }, s.header),
        h('p', { className: 'dcw-card-hint' }, s.headerHint),
      ),
      h(
        'div',
        { className: 'dcw-row dcw-row-fixed' },
        h('div', { className: 'dcw-row-label' }, TAG_LABEL.file),
        h(
          'div',
          { className: 'dcw-row-control' },
          h('span', { className: 'dcw-static' }, h(LockIcon), s.fixed),
          h('p', { className: 'dcw-row-hint' }, s.fixedHint),
        ),
      ),
      ...HEADER_TAGS.map((tag) =>
        h(ValueRow, {
          key: tag,
          tag,
          strings: s,
          entry: draft[tag],
          disabled,
          onChange: (entry) => update({ [tag]: entry }),
        }),
      ),
    ),
    h(
      'section',
      { className: 'dcw-card', 'aria-labelledby': 'dcw-contract-title' },
      h(
        'div',
        { className: 'dcw-card-head' },
        h('h4', { className: 'dcw-card-title', id: 'dcw-contract-title' }, s.contract),
        h('p', { className: 'dcw-card-hint' }, s.contractHint),
      ),
      h(
        'div',
        { className: 'dcw-flags' },
        ...CONTRACT_TAGS.map((tag) =>
          h(Flag, {
            key: tag,
            tag,
            checked: draft[tag],
            disabled,
            hint: s[HINT_KEY[tag]],
            onChange: (value) => update({ [tag]: value }),
          }),
        ),
      ),
    ),
    h(
      'details',
      { className: 'dcw-card' },
      h('summary', null, h('span', { className: 'dcw-card-title' }, s.extra), h(Chevron)),
      h('p', { className: 'dcw-card-hint', style: { margin: '0 14px 2px' } }, s.extraHint),
      h(
        'div',
        { className: 'dcw-flags' },
        ...EXTRA_TAGS.map((tag) =>
          h(Flag, {
            key: tag,
            tag,
            checked: draft[tag],
            disabled,
            onChange: (value) => update({ [tag]: value }),
          }),
        ),
      ),
    ),
    h(Preview, { config: draft, strings: s }),
    editable
      ? h(
          'div',
          { className: 'dcw-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'dcw-btn dcw-btn-primary',
              onClick: save,
              disabled: busy || !ready || !dirty,
            },
            s.save,
          ),
          h('button', { type: 'button', className: 'dcw-btn', onClick: reset, disabled: busy || !dirty }, s.reset),
          h(
            'p',
            { className: 'dcw-status', role: 'status', 'data-tone': tone },
            message || (dirty ? s.unsaved : ''),
          ),
        )
      : null,
  )
}

// 组合包 cordis.patch.yml 插入的 profile 条目 id；设置服务按它定位表单。
const ENTRY_ID = 'cpp-workflow'

function page(ownerProps, form) {
  return h(ConfigPage, { ...(ownerProps || {}), form })
}

function apply(ctx) {
  const form = ctx.configForms ? ctx.configForms.get(ENTRY_ID) : undefined
  const mount = () =>
    ctx.slots.inject('plugins.bundle.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.bundle.config',
          key: PACKAGE_NAME,
          label: () => t().nav,
        },
        (ownerProps) => (ownerProps && ownerProps.view === 'summary' ? null : page(ownerProps, form)),
      ),
    )
  if (ctx.configForms && typeof ctx.configForms.whileServed === 'function') {
    ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], mount), 'dsh-cpp-workflow: 配置挂点')
  } else {
    mount()
  }
}

module.exports = {
  name: PACKAGE_NAME,
  inject: ['slots', 'configForms'],
  apply,
  ConfigPage,
  diffOperations,
  previewText,
}
