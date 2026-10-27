'use strict'

// 客户端半侧：设置导航里的「C++ 工程流程」页与插件页的配置卡片共用同一个组件。
// 标签策略在本文件上方内联（由 scripts/building-client.mjs 从 src/comment-policy.js
// 拼进来），所以预览、默认值与服务端快照永远同源；这里只做表单与排版。
//
// 版式参照 VS Code 设置页：左侧标签与说明、右侧控件，行间细分隔线；
// 修改过默认值的行在标签前加一个圆点，底部固定一条保存栏。
const React = require('react')
const h = React.createElement

const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'

const STRINGS = {
  zh: {
    nav: 'C++ 工程流程',
    title: '文档注释',
    intro: '设置文件头与函数声明注释里默认写出的 Doxygen 标签；改动影响之后写出的注释，已有源码保持原样。',
    header: '文件头',
    headerHint: '每个手写源文件开头的一段 /// 注释。',
    contract: '函数契约',
    contractHint: '函数声明注释里要求的参数与失败信息。',
    extra: '更多标签',
    extraHint: '需要时在单个函数上补写。',
    file: '@file',
    fileHint: '取自当前文件名。',
    briefHint: '一句话说明这个文件定义或实现什么；留空则由文件自述。',
    authorHint: '作者署名；留空不写。',
    dateHint: '创建或修改日期；留空不写。',
    copyrightHint: '版权声明；留空不写。',
    versionHint: '文件版本号；留空不写。',
    emptyValue: '留空不写',
    briefEmpty: '留空则由文件自述',
    preview: '预览',
    previewHint: '按当前开关生成；文件名以占位符表示。',
    save: '保存',
    reset: '重置',
    saved: '已保存，下一次读取技能时生效。',
    rejected: '宿主拒绝了这次保存：配置可能已在别处修改，请重置后再试。',
    unsaved: '有未保存的改动。',
    loading: '正在读取配置…',
    unreadable: '当前账户不能修改这份配置。',
    readOnly: '此处显示出厂值；修改在「插件」页的配置卡片里进行。',
    openSettings: '打开插件配置',
    modified: '与出厂值不同',
  },
  en: {
    nav: 'C++ Workflow',
    title: 'Documentation comments',
    intro: 'Choose the Doxygen tags written by default in file headers and declaration comments. Changes affect new comments; existing sources stay as they are.',
    header: 'File header',
    headerHint: 'The /// block at the top of every hand-written source.',
    contract: 'Function contract',
    contractHint: 'Parameter and failure tags required in declaration comments.',
    extra: 'More tags',
    extraHint: 'Add them per function when needed.',
    file: '@file',
    fileHint: 'Taken from the current file name.',
    briefHint: 'One sentence about what this file defines; leave empty and the file writes its own.',
    authorHint: 'Author credit; left empty, omitted.',
    dateHint: 'Creation or change date; left empty, omitted.',
    copyrightHint: 'Copyright notice; left empty, omitted.',
    versionHint: 'File version; left empty, omitted.',
    emptyValue: 'Empty means omit',
    briefEmpty: 'Empty: the file writes its own',
    preview: 'Preview',
    previewHint: 'Generated from the switches; the file name is a placeholder.',
    save: 'Save',
    reset: 'Reset',
    saved: 'Saved; the next skill read uses it.',
    rejected: 'The host rejected the save: the config changed elsewhere. Reset and try again.',
    unsaved: 'Unsaved changes.',
    loading: 'Reading configuration…',
    unreadable: 'This account cannot edit the configuration.',
    readOnly: 'Factory values are shown here; edit them on the Plugins page.',
    openSettings: 'Open plugin settings',
    modified: 'Differs from the factory value',
  },
}

function language() {
  const value = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'zh'
  return String(value).toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function t() {
  return STRINGS[language()]
}

const palette = {
  label: 'var(--dsw-alias-label-primary, inherit)',
  muted: 'var(--dsw-alias-label-secondary, #6b7280)',
  line: 'var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.24))',
  surface: 'var(--dsw-alias-bg-layer-2, rgba(127, 127, 127, 0.06))',
  field: 'var(--dsw-alias-bg-layer-1, rgba(127, 127, 127, 0.04))',
  brand: 'var(--dsw-alias-brand-primary, #4f6bed)',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}

const descriptionStyle = () => ({ margin: '2px 0 0', fontSize: 12, lineHeight: 1.55, color: palette.muted })
const sectionTitleStyle = () => ({ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: palette.label })

function Section(props) {
  return h(
    'section',
    {
      style: {
        marginTop: props.first ? 16 : 22,
        paddingTop: props.first ? 0 : 14,
        borderTop: props.first ? 'none' : `1px solid ${palette.line}`,
      },
    },
    h('h4', { style: sectionTitleStyle() }, props.title),
    props.description ? h('p', { style: descriptionStyle() }, props.description) : null,
    h('div', { style: { marginTop: 6 } }, props.children),
  )
}

function Row(props) {
  return h(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(160px, 240px)',
        columnGap: 24,
        alignItems: 'start',
        padding: '10px 0',
        borderBottom: `1px solid ${palette.line}`,
      },
    },
    h(
      'div',
      { style: { minWidth: 0 } },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 } },
        props.modified
          ? h('span', {
              key: 'dot',
              title: props.modifiedLabel,
              'aria-label': props.modifiedLabel,
              style: { width: 6, height: 6, borderRadius: '50%', background: palette.brand, flex: 'none' },
            })
          : null,
        h('span', { style: { fontSize: 13, lineHeight: '20px', color: palette.label, fontFamily: props.mono ? palette.mono : 'inherit' } }, props.label),
      ),
      props.description ? h('p', { style: descriptionStyle() }, props.description) : null,
    ),
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minHeight: 20 } },
      props.control,
    ),
  )
}

function Checkbox(props) {
  return h(
    'button',
    {
      type: 'button',
      role: 'checkbox',
      'aria-checked': Boolean(props.checked),
      'aria-label': props.label,
      disabled: Boolean(props.disabled),
      onClick: () => props.onChange(!props.checked),
      style: {
        flex: 'none',
        width: 16,
        height: 16,
        padding: 0,
        borderRadius: 4,
        border: `1px solid ${props.checked ? palette.brand : palette.line}`,
        background: props.checked ? palette.brand : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: props.disabled ? 'default' : 'pointer',
        opacity: props.disabled ? 0.55 : 1,
        transition: 'background-color 0.12s ease, border-color 0.12s ease',
      },
    },
    h(
      'svg',
      { width: 11, height: 11, viewBox: '0 0 12 12', 'aria-hidden': 'true' },
      h('path', {
        d: 'M2.6 6.3 5 8.7l4.4-5.2',
        fill: 'none',
        stroke: '#fff',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        opacity: props.checked ? 1 : 0,
      }),
    ),
  )
}

function ValueRow(props) {
  const s = props.strings
  const entry = props.entry
  return h(Row, {
    label: TAG_LABEL[props.tag],
    mono: true,
    description: props.hint,
    modified: props.modified,
    modifiedLabel: s.modified,
    control: [
      h(Checkbox, {
        key: 'check',
        label: TAG_LABEL[props.tag],
        checked: entry.enabled,
        disabled: props.disabled,
        onChange: (enabled) => props.onChange({ ...entry, enabled }),
      }),
      h('input', {
        key: 'input',
        type: 'text',
        value: entry.value,
        placeholder: props.tag === 'brief' ? s.briefEmpty : s.emptyValue,
        disabled: props.disabled || !entry.enabled,
        'aria-label': TAG_LABEL[props.tag],
        onChange: (event) => props.onChange({ ...entry, value: event.target.value }),
        style: {
          width: '100%',
          minWidth: 0,
          fontSize: 13,
          lineHeight: '18px',
          padding: '3px 7px',
          borderRadius: 4,
          border: `1px solid ${palette.line}`,
          background: entry.enabled && !props.disabled ? palette.field : 'transparent',
          color: entry.enabled ? 'inherit' : palette.muted,
          fontFamily: palette.mono,
          boxSizing: 'border-box',
        },
      }),
    ],
  })
}

function FlagRow(props) {
  return h(Row, {
    label: TAG_LABEL[props.tag],
    mono: true,
    description: props.hint,
    modified: props.modified,
    modifiedLabel: props.strings.modified,
    control: h(Checkbox, {
      label: TAG_LABEL[props.tag],
      checked: Boolean(props.checked),
      disabled: props.disabled,
      onChange: (value) => props.onChange(value),
    }),
  })
}

function Preview(props) {
  const s = props.strings
  return h(
    'section',
    { 'aria-label': s.preview, style: { marginTop: 22, paddingTop: 14, borderTop: `1px solid ${palette.line}` } },
    h('h4', { style: sectionTitleStyle() }, s.preview),
    h('p', { style: descriptionStyle() }, s.previewHint),
    h(
      'pre',
      {
        style: {
          margin: '8px 0 0',
          padding: '10px 12px',
          borderRadius: 6,
          background: palette.surface,
          border: `1px solid ${palette.line}`,
          overflowX: 'auto',
          fontSize: 12.5,
          lineHeight: 1.65,
          fontFamily: palette.mono,
          whiteSpace: 'pre',
          color: palette.label,
        },
      },
      previewText(props.config),
    ),
  )
}

function diffOperations(draft, base) {
  const operations = []
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    const next = JSON.stringify(draft[key])
    const previous = JSON.stringify(base[key])
    if (next !== previous) operations.push({ op: 'set', path: [key], value: draft[key] })
  }
  return operations
}

function isModified(key, draft) {
  return JSON.stringify(draft[key]) !== JSON.stringify(DEFAULT_CONFIG[key])
}

function ConfigPage(props) {
  const s = t()
  const form = props.form
  const initial = React.useMemo(() => normalizeConfig(form && form.state ? form.state.value : undefined), [])
  const [draft, setDraft] = React.useState(initial)
  const [base, setBase] = React.useState(initial)
  const [dirty, setDirty] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const revision = form && form.state ? form.state.revision : undefined
  const ready = Boolean(form && form.state && form.state.status === 'ready' && form.state.writable && form.state.mode === 'host')
  const status = form && form.state ? form.state.status : 'missing'

  React.useEffect(() => {
    if (dirty || !form || !form.state || form.state.status !== 'ready') return
    const next = normalizeConfig(form.state.value)
    setBase(next)
    setDraft(next)
  }, [revision, status, dirty, form])

  const update = (patch) => {
    setDraft((current) => ({ ...current, ...patch }))
    setDirty(true)
    setMessage('')
  }

  const reset = () => {
    setDraft(base)
    setDirty(false)
    setMessage('')
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
      } else {
        setMessage(s.rejected)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const editable = Boolean(form)
  const headerHints = {
    brief: s.briefHint,
    author: s.authorHint,
    date: s.dateHint,
    copyright: s.copyrightHint,
    version: s.versionHint,
  }

  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', padding: '2px 0 8px', maxWidth: 760, color: palette.label } },
    h('h3', { style: { margin: '0 0 2px', fontSize: 15, fontWeight: 600 } }, s.title),
    h('p', { style: descriptionStyle() }, s.intro),
    !editable
      ? h(
          'div',
          {
            role: 'status',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 10,
              padding: '8px 10px',
              borderRadius: 6,
              background: palette.surface,
              border: `1px solid ${palette.line}`,
            },
          },
          h('p', { style: { ...descriptionStyle(), margin: 0, flex: '1 1 200px' } }, s.readOnly),
          props.openPluginPage
            ? h('button', { type: 'button', onClick: props.openPluginPage, style: secondaryButton(true) }, s.openSettings)
            : null,
        )
      : null,
    editable && !ready && status !== 'missing'
      ? h('p', { role: 'status', style: descriptionStyle() }, status === 'loading' ? s.loading : s.unreadable)
      : null,
    h(
      Section,
      { title: s.header, description: s.headerHint, first: true },
      h(Row, {
        label: s.file,
        mono: true,
        description: s.fileHint,
        control: null,
      }),
      ...HEADER_TAGS.map((tag) =>
        h(ValueRow, {
          key: tag,
          tag,
          hint: headerHints[tag],
          strings: s,
          disabled: !editable,
          modified: editable && isModified(tag, draft),
          entry: draft[tag],
          onChange: (entry) => update({ [tag]: entry }),
        }),
      ),
    ),
    h(
      Section,
      { title: s.contract, description: s.contractHint },
      ...CONTRACT_TAGS.map((tag) =>
        h(FlagRow, {
          key: tag,
          tag,
          hint: TAG_TEXT[tag],
          strings: s,
          disabled: !editable,
          modified: editable && isModified(tag, draft),
          checked: draft[tag],
          onChange: (value) => update({ [tag]: value }),
        }),
      ),
    ),
    h(
      Section,
      { title: s.extra, description: s.extraHint },
      ...EXTRA_TAGS.map((tag) =>
        h(FlagRow, {
          key: tag,
          tag,
          hint: TAG_TEXT[tag],
          strings: s,
          disabled: !editable,
          modified: editable && isModified(tag, draft),
          checked: draft[tag],
          onChange: (value) => update({ [tag]: value }),
        }),
      ),
    ),
    h(Preview, { config: draft, strings: s }),
    editable
      ? h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 20,
              paddingTop: 12,
              borderTop: `1px solid ${palette.line}`,
              flexWrap: 'wrap',
            },
          },
          h(
            'button',
            {
              type: 'button',
              onClick: save,
              disabled: busy || !ready || !dirty,
              style: primaryButton(dirty && ready && !busy),
            },
            s.save,
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: reset,
              disabled: busy || !dirty,
              style: secondaryButton(dirty && !busy),
            },
            s.reset,
          ),
          h('p', { role: 'status', style: { ...descriptionStyle(), margin: 0, flex: '1 1 200px' } }, message || (dirty ? s.unsaved : '')),
        )
      : null,
  )
}

function primaryButton(enabled) {
  return {
    fontSize: 13,
    lineHeight: '20px',
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid transparent',
    background: enabled ? palette.brand : 'var(--dsw-alias-bg-layer-3, rgba(127, 127, 127, 0.2))',
    color: enabled ? '#fff' : palette.muted,
    cursor: enabled ? 'pointer' : 'default',
  }
}

function secondaryButton(enabled) {
  return {
    fontSize: 13,
    lineHeight: '20px',
    padding: '4px 12px',
    borderRadius: 4,
    border: `1px solid ${palette.line}`,
    background: 'transparent',
    color: enabled ? palette.label : palette.muted,
    cursor: enabled ? 'pointer' : 'default',
  }
}

function page(ownerProps, openPluginPage) {
  const props = ownerProps || {}
  return h(ConfigPage, { ...props, openPluginPage })
}

function apply(ctx) {
  let openPluginPage
  try {
    const navigation = typeof ctx.get === 'function' ? ctx.get('pluginNavigation') : undefined
    if (navigation && typeof navigation.openBundle === 'function') {
      openPluginPage = () => navigation.openBundle(PACKAGE_NAME)
    }
  } catch {}
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'cpp-workflow',
        order: 60,
        label: () => t().nav,
      },
      (ownerProps) => page(ownerProps, openPluginPage),
    ),
  )
  ctx.slots.inject('plugins.bundle.config', () =>
    ctx.slots.register(
      {
        name: 'plugins.bundle.config',
        key: PACKAGE_NAME,
        label: () => t().nav,
      },
      (ownerProps) => (ownerProps && ownerProps.view === 'summary' ? null : page(ownerProps, undefined)),
    ),
  )
}

module.exports = {
  name: PACKAGE_NAME,
  inject: ['slots'],
  apply,
  ConfigPage,
  diffOperations,
  previewText,
}
