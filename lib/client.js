// 由 scripts/building-client.mjs 生成，请改 src/comment-policy.ts 与 src/client/app.cjs.js。
window.__ModuleLoader__.load({
  id: "@chengzhao-dev/dsh-cpp-workflow",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

/**
 * 注释标签策略：设置页的预览、技能快照与检查器参数共用这一份。
 *
 * 配置只描述「写注释时默认带哪些标签」，不描述写法本身；写法在
 * `skills/developing-cpp/references/comments.md`。设置页保存的值由宿主
 * 写回插件 Config，服务端 `apply(ctx, config)` 用它生成本页快照与检查器参数。
 *
 * 这份文件被 `tsc` 编进 `lib/comment-policy.js`，打包客户端半侧时再内联进
 * `lib/client.js`，所以只能依赖纯函数，不要引入 Node 或 React。
 */
/** 文件头标签。 */
const HEADER_TAGS = ['brief', 'author', 'date', 'copyright', 'version'];
/** 函数契约标签：开关决定是否要求写出。 */
const CONTRACT_TAGS = ['param', 'returns', 'throws'];
/** 折叠在「更多标签」里的可选标签：默认关闭。 */
const EXTRA_TAGS = ['note', 'see', 'pre', 'post', 'tparam', 'retval'];
/** 只有用户主动填了非空值才放行的隐私标签。 */
const PRIVACY_TAGS = ['author', 'date', 'copyright', 'version'];
/** 标签说明：设置页逐行显示，用作行的辅助文字。 */
const TAG_TEXT = {
    brief: '一句话说明这个文件定义或实现什么',
    author: '只在用户填了非空值时写出',
    date: '只在用户填了非空值时写出',
    copyright: '只在用户填了非空值时写出',
    version: '只在用户填了非空值时写出',
    param: '函数参数的含义、范围或所有权',
    returns: '返回值的条件；返回类型自明时可以省略',
    throws: '抛出的异常类型与条件；不抛异常的函数不写',
    note: '调用方需要注意的补充说明',
    see: '相关函数、类型或文档',
    pre: '调用前必须成立的条件',
    post: '调用后保证成立的条件',
    tparam: '模板参数',
    retval: '特定返回值的含义',
};
/** 开关型标签在设置页的标题。 */
const TAG_LABEL = {
    brief: '@brief',
    author: '@author',
    date: '@date',
    copyright: '@copyright',
    version: '@version',
    param: '@param',
    returns: '@return',
    throws: '@throws',
    note: '@note',
    see: '@see',
    pre: '@pre',
    post: '@post',
    tparam: '@tparam',
    retval: '@retval',
};
/** 出厂配置：文件头只留 @file 与 @brief，契约标签全开，隐私标签全关。 */
const DEFAULT_CONFIG = {
    brief: { enabled: true, value: '' },
    author: { enabled: false, value: '' },
    date: { enabled: false, value: '' },
    copyright: { enabled: false, value: '' },
    version: { enabled: false, value: '' },
    param: true,
    returns: true,
    throws: true,
    note: false,
    see: false,
    pre: false,
    post: false,
    tparam: false,
    retval: false,
};
function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function flag(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}
/**
 * 把宿主给的值补齐成完整配置；缺字段、旧版本或手工改坏的配置都回到出厂值。
 */
function normalizeConfig(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const config = {};
    for (const tag of HEADER_TAGS) {
        const entry = source[tag] && typeof source[tag] === 'object' ? source[tag] : {};
        config[tag] = {
            enabled: flag(entry.enabled, DEFAULT_CONFIG[tag].enabled),
            value: text(entry.value),
        };
    }
    for (const tag of [...CONTRACT_TAGS, ...EXTRA_TAGS]) {
        config[tag] = flag(source[tag], DEFAULT_CONFIG[tag]);
    }
    return config;
}
/**
 * 按配置渲染文件头；`@file` 始终是传入的文件名。
 */
function renderFileHeader(raw, fileName) {
    const config = normalizeConfig(raw);
    const name = text(fileName) || 'board.h';
    const lines = [`/// @file ${name}`];
    if (config.brief.enabled) {
        lines.push(config.brief.value ? `/// @brief ${config.brief.value}` : '/// @brief');
    }
    for (const tag of ['author', 'date', 'copyright', 'version']) {
        if (config[tag].enabled && config[tag].value)
            lines.push(`/// @${tag} ${config[tag].value}`);
    }
    return lines;
}
/**
 * 设置页的预览：文件头 + 一段函数注释，只显示当前配置会写出的标签。
 */
function previewParts(raw, sampleName) {
    const config = normalizeConfig(raw);
    const header = renderFileHeader(config, sampleName || 'board.h');
    const contract = [];
    if (config.param)
        contract.push('/// @param position 目标行列坐标。');
    if (config.returns)
        contract.push('/// @return 放置成功时为 true。');
    if (config.throws)
        contract.push('/// @throws std::out_of_range 坐标越界时抛出。');
    const declaration = '[[nodiscard]] bool PlaceCell(CellPosition position, CellType cell_type);';
    return { header, contract, declaration };
}
/**
 * 设置页预览的纯文本形式；客户端半侧用同一份实现渲染 `<pre>`。
 */
function previewText(raw, sampleName) {
    const { header, contract, declaration } = previewParts(raw, sampleName);
    const lines = [...header, '///', '/// 放置成功返回 true；坐标越界或目标已占时返回 false。'];
    if (contract.length > 0)
        lines.push('///', ...contract);
    lines.push(declaration);
    return lines.join('\n');
}
/**
 * 检查器参数：隐私标签要显式放行，@brief 被关掉时跳过摘要检查。
 */
function checkerArgs(raw) {
    const config = normalizeConfig(raw);
    const args = [];
    if (!config.brief.enabled)
        args.push('--no-brief');
    for (const tag of PRIVACY_TAGS) {
        if (config[tag].enabled && config[tag].value)
            args.push('--allow-tag', tag);
    }
    return args;
}
/**
 * 技能快照：`get()` 把它接在技能正文末尾，让代理看到当前 profile 的标签开关。
 */
function snapshotText(raw) {
    const config = normalizeConfig(raw);
    const on = [];
    const off = [];
    for (const tag of HEADER_TAGS) {
        const entry = config[tag];
        const label = entry.value ? `${TAG_LABEL[tag]} ${entry.value}` : TAG_LABEL[tag];
        if (entry.enabled)
            on.push(label);
        else
            off.push(TAG_LABEL[tag]);
    }
    const contract = CONTRACT_TAGS.filter((tag) => config[tag]).map((tag) => TAG_LABEL[tag]);
    const extra = EXTRA_TAGS.filter((tag) => config[tag]).map((tag) => TAG_LABEL[tag]);
    const allowed = PRIVACY_TAGS.filter((tag) => config[tag].enabled && config[tag].value);
    const head = `## 当前注释配置（profile）\n\n`;
    const body = [
        `- 文件头：@file 固定为文件名；开启 ${on.join('、') || '无'}；关闭 ${off.join('、') || '无'}。`,
        `- 函数契约：${contract.length > 0 ? contract.join('、') : '不要求'}。`,
        `- 更多标签：${extra.length > 0 ? `可选 ${extra.join('、')}` : '未启用'}。`,
        `- 检查器放行：${allowed.length > 0 ? allowed.join('、') : '无'}（隐私标签只有填了非空值才放行）。`,
    ];
    return head + body.join('\n');
}


// 客户端半侧：设置导航里的「C++ 工程流程」页与插件页的配置卡片共用同一个组件。
// 标签策略在本文件上方内联（由 scripts/building-client.mjs 从 src/comment-policy.js
// 拼进来），所以预览、默认值与服务端快照永远同源；这里只做表单与排版。
const React = require('react')
const h = React.createElement

const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'
const SAMPLE_FILE = 'board.h'

const STRINGS = {
  zh: {
    nav: 'C++ 工程流程',
    title: '文档注释',
    intro: '文件头与函数契约默认写出哪些 Doxygen 标签。配置只影响代理写注释的默认值，不改已有源码。',
    header: '文件头',
    contract: '函数契约',
    extra: '更多标签',
    extraHint: '默认关闭；需要时在单个函数上补写。',
    file: '@file',
    fileHint: '固定为当前文件名，不参与配置。',
    emptyValue: '留空则由每个文件自己写',
    on: '写出',
    off: '不写',
    preview: '预览',
    previewHint: '示例文件名 board.h；预览随开关即时更新。',
    save: '保存',
    reset: '重置',
    saved: '已保存，下一次读取技能时生效。',
    rejected: '宿主拒绝了这次保存：配置可能已在别处修改，请重置后再试。',
    unsaved: '有未保存的改动。',
    loading: '正在读取配置…',
    unreadable: '当前账户不能修改这份配置。',
    readOnly: '此处只显示出厂值。要修改配置，请到「插件」页打开 dsh-cpp-workflow 的配置卡片。',
    noForm: '这个入口没有可写表单，配置在插件页修改。',
  },
  en: {
    nav: 'C++ Workflow',
    title: 'Documentation comments',
    intro: 'Which Doxygen tags the agent writes by default. This changes defaults only; existing sources are untouched.',
    header: 'File header',
    contract: 'Function contract',
    extra: 'More tags',
    extraHint: 'Off by default; add them per function when needed.',
    file: '@file',
    fileHint: 'Always the current file name; not configurable.',
    emptyValue: 'Leave empty and each file writes its own',
    on: 'Write',
    off: 'Omit',
    preview: 'Preview',
    previewHint: 'Sample name board.h; the preview follows the switches.',
    save: 'Save',
    reset: 'Reset',
    saved: 'Saved; the next skill read uses it.',
    rejected: 'The host rejected the save: the config changed elsewhere. Reset and try again.',
    unsaved: 'Unsaved changes.',
    loading: 'Reading configuration…',
    unreadable: 'This account cannot edit the configuration.',
    readOnly: 'Showing factory defaults. Edit the dsh-cpp-workflow card on the Plugins page.',
    noForm: 'This entry has no writable form; edit it on the Plugins page.',
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
  muted: 'var(--dsw-text-tertiary, #6b7280)',
  line: 'var(--dsw-border-subtle, rgba(127, 127, 127, 0.24))',
  surface: 'var(--dsw-surface-raised, rgba(127, 127, 127, 0.06))',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}

function rowStyle(extra) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 0',
    borderBottom: `1px solid ${palette.line}`,
    ...extra,
  }
}

function hintStyle() {
  return { margin: '2px 0 0', fontSize: 12, lineHeight: 1.5, color: palette.muted }
}

function Switch(props) {
  return h(
    'label',
    { style: { display: 'inline-flex', alignItems: 'center', gap: 8, cursor: props.disabled ? 'default' : 'pointer', minWidth: 132 } },
    h('input', {
      type: 'checkbox',
      checked: Boolean(props.checked),
      disabled: Boolean(props.disabled),
      onChange: (event) => props.onChange(event.target.checked),
      style: { margin: 0 },
    }),
    h('span', { style: { fontSize: 13, fontFamily: palette.mono } }, props.label),
  )
}

function HeaderTagRow(props) {
  const s = props.strings
  const entry = props.entry
  return h(
    'div',
    { style: rowStyle({ flexWrap: 'wrap' }) },
    h('div', { style: { flex: '1 1 280px', minWidth: 0 } },
      h(Switch, {
        label: TAG_LABEL[props.tag],
        checked: entry.enabled,
        onChange: (enabled) => props.onChange({ ...entry, enabled }),
      }),
      h('p', { style: hintStyle() }, TAG_TEXT[props.tag] || ''),
    ),
    h('input', {
      type: 'text',
      value: entry.value,
      placeholder: s.emptyValue,
      disabled: !entry.enabled,
      'aria-label': `${TAG_LABEL[props.tag]} value`,
      onChange: (event) => props.onChange({ ...entry, value: event.target.value }),
      style: {
        flex: '1 1 220px',
        minWidth: 0,
        fontSize: 13,
        padding: '5px 8px',
        borderRadius: 6,
        border: `1px solid ${palette.line}`,
        background: entry.enabled ? 'transparent' : palette.surface,
        color: 'inherit',
      },
    }),
  )
}

function Preview(props) {
  const s = props.strings
  const text = previewText(props.config, SAMPLE_FILE)
  return h(
    'section',
    { 'aria-label': s.preview, style: { marginTop: 18 } },
    h('h4', { style: { margin: '0 0 4px', fontSize: 13, fontWeight: 600 } }, s.preview),
    h('p', { style: hintStyle() }, s.previewHint),
    h(
      'pre',
      {
        style: {
          margin: '8px 0 0',
          padding: '10px 12px',
          borderRadius: 8,
          background: palette.surface,
          border: `1px solid ${palette.line}`,
          overflowX: 'auto',
          fontSize: 12.5,
          lineHeight: 1.65,
          fontFamily: palette.mono,
          whiteSpace: 'pre',
        },
      },
      text,
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
  const editableReady = editable && ready
  const headerTags = ['brief', 'author', 'date', 'copyright', 'version']

  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0 12px', maxWidth: 720 } },
    h('h3', { style: { margin: '0 0 2px', fontSize: 15, fontWeight: 600 } }, s.title),
    h('p', { style: hintStyle() }, s.intro),
    !editable
      ? h('p', { role: 'status', style: { ...hintStyle(), color: 'inherit', marginTop: 8 } }, s.readOnly)
      : null,
    editable && !ready && status !== 'missing'
      ? h('p', { role: 'status', style: hintStyle() }, status === 'loading' ? s.loading : s.unreadable)
      : null,
    h(
      'fieldset',
      { style: { margin: '14px 0 0', padding: 0, border: 0 } },
      h('legend', { style: { padding: 0, fontSize: 13, fontWeight: 600 } }, s.header),
      h(
        'div',
        { style: rowStyle() },
        h(Switch, { label: s.file, checked: true, disabled: true, onChange: () => {} }),
        h('p', { style: { ...hintStyle(), margin: 0 } }, s.fileHint),
      ),
      ...headerTags.map((tag) =>
        h(HeaderTagRow, {
          key: tag,
          tag,
          strings: s,
          entry: draft[tag],
          onChange: (entry) => update({ [tag]: entry }),
        }),
      ),
    ),
    h(
      'fieldset',
      { style: { margin: '18px 0 0', padding: 0, border: 0 } },
      h('legend', { style: { padding: 0, fontSize: 13, fontWeight: 600 } }, s.contract),
      h(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', padding: '8px 0 2px' } },
        ...CONTRACT_TAGS.map((tag) =>
          h(
            'div',
            { key: tag, style: { flex: '1 1 180px', minWidth: 180 } },
            h(Switch, {
              label: TAG_LABEL[tag],
              checked: draft[tag],
              onChange: (value) => update({ [tag]: value }),
            }),
            h('p', { style: hintStyle() }, TAG_TEXT[tag]),
          ),
        ),
      ),
    ),
    h(
      'details',
      { style: { marginTop: 16, paddingTop: 10, borderTop: `1px solid ${palette.line}` } },
      h('summary', { style: { cursor: 'pointer', fontSize: 13, fontWeight: 600 } }, s.extra),
      h('p', { style: hintStyle() }, s.extraHint),
      h(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', paddingTop: 4 } },
        ...EXTRA_TAGS.map((tag) =>
          h(
            'div',
            { key: tag, style: { flex: '1 1 180px', minWidth: 180 } },
            h(Switch, {
              label: TAG_LABEL[tag],
              checked: draft[tag],
              onChange: (value) => update({ [tag]: value }),
            }),
          ),
        ),
      ),
    ),
    h(Preview, { config: draft, strings: s }),
    editable
      ? h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' } },
          h(
            'button',
            {
              type: 'button',
              onClick: save,
              disabled: busy || !editableReady || !dirty,
              style: { fontSize: 13, padding: '6px 14px', borderRadius: 6, cursor: 'pointer' },
            },
            s.save,
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: reset,
              disabled: busy || !dirty,
              style: { fontSize: 13, padding: '6px 14px', borderRadius: 6, cursor: 'pointer' },
            },
            s.reset,
          ),
          h('p', { role: 'status', style: { ...hintStyle(), margin: 0, flex: '1 1 220px' } }, message || (dirty ? s.unsaved : '')),
        )
      : null,
  )
}

function page(ownerProps, titled) {
  const props = ownerProps || {}
  return h(ConfigPage, { ...props, titled })
}

function apply(ctx) {
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'cpp-workflow',
        order: 60,
        label: () => t().nav,
      },
      (ownerProps) => page(ownerProps, true),
    ),
  )
  ctx.slots.inject('plugins.bundle.config', () =>
    ctx.slots.register(
      {
        name: 'plugins.bundle.config',
        key: PACKAGE_NAME,
        label: () => t().nav,
      },
      (ownerProps) => (ownerProps && ownerProps.view === 'summary' ? null : page(ownerProps, false)),
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

    return module.exports
  },
})
