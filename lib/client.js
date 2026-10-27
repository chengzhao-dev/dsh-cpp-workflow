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
    file: '@file',
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
const SAMPLE_BRIEF = '<一句话说明本文件>';
/** 预览里的示例文件名：只是占位符，不对应任何工程的真实文件。 */
const SAMPLE_FILE = '<文件名>';
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
    const name = text(fileName) || SAMPLE_FILE;
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
    const header = renderFileHeader(config, sampleName || SAMPLE_FILE);
    // 预览是示例：@brief 开着但用户没填句子时，用示例文件自己的摘要顶替。
    const briefIndex = header.indexOf('/// @brief');
    if (briefIndex !== -1)
        header[briefIndex] = `/// @brief ${SAMPLE_BRIEF}`;
    const contract = [];
    if (config.param)
        contract.push('/// @param row 目标行号。');
    if (config.returns)
        contract.push('/// @return 放置成功时为 true。');
    if (config.throws)
        contract.push('/// @throws std::out_of_range 行号越界时抛出。');
    const declaration = '[[nodiscard]] bool Place(int row, int column);';
    return { header, contract, declaration };
}
/**
 * 设置页预览的纯文本形式；客户端半侧用同一份实现渲染 `<pre>`。
 */
function previewText(raw, sampleName) {
    const { header, contract, declaration } = previewParts(raw, sampleName);
    const lines = [...header, '///', '/// 放置成功时返回 true；行号越界或目标格子已占时返回 false。'];
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
    unreadable: '当前账户不能修改这份配置。',
    readOnly: '这里显示出厂值。要改，请到「插件」页打开 dsh-cpp-workflow 的配置卡片。',
    openSettings: '打开插件配置',
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
    unreadable: 'This account cannot edit the configuration.',
    readOnly: 'Showing factory defaults. Edit the dsh-cpp-workflow card on the Plugins page.',
    openSettings: 'Open plugin settings',
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
    const next = JSON.stringify(draft[key])
    const previous = JSON.stringify(base[key])
    if (next !== previous) operations.push({ op: 'set', path: [key], value: draft[key] })
  }
  return operations
}

function ConfigPage(props) {
  const s = t()
  ensureStyles()
  const form = props.form
  const initial = React.useMemo(() => normalizeConfig(form && form.state ? form.state.value : undefined), [])
  const [draft, setDraft] = React.useState(initial)
  const [base, setBase] = React.useState(initial)
  const [dirty, setDirty] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [tone, setTone] = React.useState('')
  const revision = form && form.state ? form.state.revision : undefined
  const ready = Boolean(
    form && form.state && form.state.status === 'ready' && form.state.writable && form.state.mode === 'host',
  )
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
  const navigation = props.pluginNavigation

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
          navigation && typeof navigation.openBundle === 'function'
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dcw-btn',
                  onClick: () => navigation.openBundle(PACKAGE_NAME),
                },
                s.openSettings,
              )
            : null,
        )
      : null,
    editable && !ready && status !== 'missing'
      ? h(
          'div',
          { className: 'dcw-note', role: 'status' },
          h('span', { className: 'dcw-note-dot' }),
          h('span', null, status === 'loading' ? s.loading : s.unreadable),
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

function page(ownerProps, pluginNavigation) {
  const props = ownerProps || {}
  return h(ConfigPage, { ...props, pluginNavigation })
}

function apply(ctx) {
  const navigation = typeof ctx.get === 'function' ? ctx.get('pluginNavigation') : undefined
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'cpp-workflow',
        order: 60,
        label: () => t().nav,
      },
      (ownerProps) => page(ownerProps, navigation),
    ),
  )
  ctx.slots.inject('plugins.bundle.config', () =>
    ctx.slots.register(
      {
        name: 'plugins.bundle.config',
        key: PACKAGE_NAME,
        label: () => t().nav,
      },
      (ownerProps) => (ownerProps && ownerProps.view === 'summary' ? null : page(ownerProps, navigation)),
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
