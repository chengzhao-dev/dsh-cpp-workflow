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
/** 预览里的示例摘要：用户没填 @brief 时用它，避免预览出现空标签。 */
const SAMPLE_BRIEF = '定义井字棋棋盘、格子坐标与格子类型。';
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
    // 预览是示例：@brief 开着但用户没填句子时，用示例文件自己的摘要顶替。
    const briefIndex = header.indexOf('/// @brief');
    if (briefIndex !== -1)
        header[briefIndex] = `/// @brief ${SAMPLE_BRIEF}`;
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
    headerHint: '每个手写源文件开头的一段 ///；带值的标签填写后写出，@brief 留空由文件自述。',
    contract: '函数契约',
    contractHint: '声明注释里的参数与失败方式；关闭后不再要求写出这些标签。',
    extra: '更多标签',
    extraHint: '默认关闭；需要时在单个函数上补写。',
    file: '@file',
    fixed: '自动',
    fileHint: '固定为当前文件名，不参与配置。',
    briefHint: '一句话说明本文件定义或实现什么；留空则由每个文件自己写。',
    authorHint: '作者署名；留空不写。',
    dateHint: '创建或修改日期；留空不写。',
    copyrightHint: '版权声明；留空不写。',
    versionHint: '文件版本号；留空不写。',
    emptyValue: '留空不写',
    briefEmpty: '留空则由文件自述',
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
    openSettings: '打开插件配置',
    noForm: '这个入口没有可写表单，配置在插件页修改。',
  },
  en: {
    nav: 'C++ Workflow',
    title: 'Documentation comments',
    intro: 'Which Doxygen tags the agent writes by default. This changes defaults only; existing sources are untouched.',
    header: 'File header',
    headerHint: 'The /// block at the top of every hand-written source; value tags are written only when filled.',
    contract: 'Function contract',
    contractHint: 'Parameter and failure tags in declaration comments; turning one off stops requiring it.',
    extra: 'More tags',
    extraHint: 'Off by default; add them per function when needed.',
    file: '@file',
    fixed: 'Auto',
    fileHint: 'Always the current file name; not configurable.',
    briefHint: 'One sentence about what this file defines; leave empty and each file writes its own.',
    authorHint: 'Author credit; left empty, omitted.',
    dateHint: 'Creation or change date; left empty, omitted.',
    copyrightHint: 'Copyright notice; left empty, omitted.',
    versionHint: 'File version; left empty, omitted.',
    emptyValue: 'Empty means omit',
    briefEmpty: 'Empty: the file writes its own',
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
    openSettings: 'Open plugin settings',
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
  label: 'var(--dsw-alias-label-primary, inherit)',
  muted: 'var(--dsw-alias-label-secondary, #6b7280)',
  faint: 'var(--dsw-alias-label-tertiary, #8b93a1)',
  line: 'var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.24))',
  surface: 'var(--dsw-alias-bg-layer-2, rgba(127, 127, 127, 0.06))',
  field: 'var(--dsw-alias-bg-layer-1, rgba(127, 127, 127, 0.04))',
  brand: 'var(--dsw-alias-brand-primary, #4f6bed)',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}

const hintStyle = () => ({ margin: '2px 0 0', fontSize: 12, lineHeight: 1.55, color: palette.muted })
const labelCellStyle = () => ({
  padding: '10px 0',
  fontFamily: palette.mono,
  fontSize: 12.5,
  lineHeight: '20px',
  color: palette.label,
  whiteSpace: 'nowrap',
  borderBottom: `1px solid ${palette.line}`,
})
const controlCellStyle = () => ({
  padding: '10px 0',
  minWidth: 0,
  borderBottom: `1px solid ${palette.line}`,
})
const gridStyle = () => ({ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr)', columnGap: 14 })

function Toggle(props) {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-checked': Boolean(props.checked),
      'aria-label': props.label,
      disabled: Boolean(props.disabled),
      onClick: () => props.onChange(!props.checked),
      style: {
        flex: 'none',
        width: 34,
        height: 20,
        padding: 0,
        border: 0,
        borderRadius: 999,
        position: 'relative',
        cursor: props.disabled ? 'default' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        background: props.checked ? palette.brand : 'var(--dsw-alias-bg-layer-4, rgba(127, 127, 127, 0.35))',
        transition: 'background-color 0.15s ease',
      },
    },
    h('span', {
      'aria-hidden': 'true',
      style: {
        position: 'absolute',
        top: 2,
        left: props.checked ? 16 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
        transition: 'left 0.15s ease',
      },
    }),
  )
}

function TagRow(props) {
  const s = props.strings
  return [
    h('div', { key: `${props.tag}-label`, style: labelCellStyle() }, props.label),
    h(
      'div',
      { key: `${props.tag}-control`, style: controlCellStyle() },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 22, flexWrap: 'wrap' } },
        props.control,
      ),
      props.hint ? h('p', { style: hintStyle() }, props.hint) : null,
    ),
  ]
}

function ValueRow(props) {
  const s = props.strings
  return h(TagRow, {
    tag: props.tag,
    label: TAG_LABEL[props.tag],
    strings: s,
    hint: props.hint,
    control: [
      h(Toggle, {
        key: 'toggle',
        label: props.label || TAG_LABEL[props.tag],
        checked: props.entry.enabled,
        disabled: props.disabled,
        onChange: (enabled) => !props.disabled && props.onChange({ ...props.entry, enabled }),
      }),
      h('input', {
        key: 'input',
        type: 'text',
        value: props.entry.value,
        placeholder: props.tag === 'brief' ? s.briefEmpty : s.emptyValue,
        disabled: props.disabled || !props.entry.enabled,
        'aria-label': TAG_LABEL[props.tag],
        onChange: (event) => props.onChange({ ...props.entry, value: event.target.value }),
        style: {
          flex: '1 1 180px',
          minWidth: 0,
          maxWidth: 320,
          fontSize: 13,
          padding: '4px 8px',
          borderRadius: 6,
          border: `1px solid ${palette.line}`,
          background: props.entry.enabled && !props.disabled ? palette.field : 'transparent',
          color: props.entry.enabled ? 'inherit' : palette.muted,
          fontFamily: palette.mono,
        },
      }),
    ],
  })
}

function FlagRow(props) {
  return h(TagRow, {
    tag: props.tag,
    label: TAG_LABEL[props.tag],
    strings: props.strings,
    hint: props.hint,
    control: h(Toggle, {
      label: TAG_LABEL[props.tag],
      checked: Boolean(props.checked),
      disabled: props.disabled,
      onChange: (value) => !props.disabled && props.onChange(value),
    }),
  })
}

function Preview(props) {
  const s = props.strings
  return h(
    'section',
    { 'aria-label': s.preview, style: { marginTop: 20 } },
    h('h4', { style: { margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: palette.label } }, s.preview),
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
          color: palette.label,
        },
      },
      previewText(props.config, SAMPLE_FILE),
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
  const header = [
    { tag: 'brief', hint: s.briefHint },
    { tag: 'author', hint: s.authorHint },
    { tag: 'date', hint: s.dateHint },
    { tag: 'copyright', hint: s.copyrightHint },
    { tag: 'version', hint: s.versionHint },
  ]
  const contractHints = { param: TAG_TEXT.param, returns: TAG_TEXT.returns, throws: TAG_TEXT.throws }
  const extraHints = { note: TAG_TEXT.note, see: TAG_TEXT.see, pre: TAG_TEXT.pre, post: TAG_TEXT.post, tparam: TAG_TEXT.tparam, retval: TAG_TEXT.retval }

  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', padding: '4px 0 12px', maxWidth: 720, color: palette.label } },
    h('h3', { style: { margin: '0 0 4px', fontSize: 15, fontWeight: 600 } }, s.title),
    h('p', { style: hintStyle() }, s.intro),
    !editable
      ? h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 } },
          h('p', { role: 'status', style: { ...hintStyle(), margin: 0 } }, s.readOnly),
          props.openPluginPage
            ? h('button', { type: 'button', onClick: props.openPluginPage, style: secondaryButton(true) }, s.openSettings)
            : null,
        )
      : null,
    editable && !ready && status !== 'missing'
      ? h('p', { role: 'status', style: hintStyle() }, status === 'loading' ? s.loading : s.unreadable)
      : null,
    h(
      'section',
      { style: { marginTop: 18 } },
      h('h4', { style: { margin: '0 0 4px', fontSize: 13, fontWeight: 600 } }, s.header),
      h('p', { style: hintStyle() }, s.headerHint),
      h(
        'div',
        { role: 'group', 'aria-label': s.header, style: { ...gridStyle(), marginTop: 8 } },
        h(
          'div',
          { key: 'file-label', style: labelCellStyle() },
          s.file,
        ),
        h(
          'div',
          { key: 'file-control', style: controlCellStyle() },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 22 } },
            h(
              'span',
              {
                style: {
                  fontSize: 12,
                  lineHeight: '20px',
                  padding: '0 8px',
                  borderRadius: 999,
                  border: `1px solid ${palette.line}`,
                  color: palette.muted,
                },
              },
              s.fixed,
            ),
            h('code', { style: { fontSize: 12.5, fontFamily: palette.mono, color: palette.muted } }, SAMPLE_FILE),
          ),
          h('p', { style: hintStyle() }, s.fileHint),
        ),
        ...header.flatMap(({ tag, hint }) =>
          h(ValueRow, {
            key: tag,
            tag,
            hint,
            strings: s,
            disabled: !editable,
            entry: draft[tag],
            onChange: (entry) => update({ [tag]: entry }),
          }),
        ),
      ),
    ),
    h(
      'section',
      { style: { marginTop: 20 } },
      h('h4', { style: { margin: '0 0 4px', fontSize: 13, fontWeight: 600 } }, s.contract),
      h('p', { style: hintStyle() }, s.contractHint),
      h(
        'div',
        { role: 'group', 'aria-label': s.contract, style: { ...gridStyle(), marginTop: 8 } },
        ...CONTRACT_TAGS.flatMap((tag) =>
          h(FlagRow, {
            key: tag,
            tag,
            hint: contractHints[tag],
            strings: s,
            disabled: !editable,
            checked: draft[tag],
            onChange: (value) => update({ [tag]: value }),
          }),
        ),
      ),
    ),
    h(
      'section',
      { style: { marginTop: 20, paddingTop: 12, borderTop: `1px solid ${palette.line}` } },
      h(
        'details',
        {},
        h(
          'summary',
          { style: { cursor: 'pointer', fontSize: 13, fontWeight: 600, listStylePosition: 'inside' } },
          s.extra,
        ),
        h('p', { style: hintStyle() }, s.extraHint),
        h(
          'div',
          { role: 'group', 'aria-label': s.extra, style: { ...gridStyle(), marginTop: 8 } },
          ...EXTRA_TAGS.flatMap((tag) =>
            h(FlagRow, {
              key: tag,
              tag,
              hint: extraHints[tag],
              strings: s,
              disabled: !editable,
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
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
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
              disabled: busy || !editableReady || !dirty,
              style: primaryButton(dirty && editableReady && !busy),
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
          h('p', { role: 'status', style: { ...hintStyle(), margin: 0, flex: '1 1 220px' } }, message || (dirty ? s.unsaved : '')),
        )
      : null,
  )
}

function primaryButton(enabled) {
  return {
    fontSize: 13,
    lineHeight: '20px',
    padding: '5px 14px',
    borderRadius: 6,
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
    padding: '5px 14px',
    borderRadius: 6,
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

    return module.exports
  },
})
