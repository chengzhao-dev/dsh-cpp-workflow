// 由 scripts/building-client.mjs 生成，请改 src/comment-policy.ts 与 src/client/*.js。
window.__ModuleLoader__.load({
  id: "@chengzhao-dev/dsh-cpp-workflow",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

/**
 * 注释标签策略：设置页的预览、技能快照与检查器参数共用这一份。
 *
 * 配置只描述「写注释时默认带哪些标签、声明用哪种注释符号」，不描述写法本身；
 * 写法在 `skills/developing-cpp/references/comments.md`。设置页保存的值由宿主
 * 写回插件 Config，服务端 `apply(ctx, config)` 用它生成本页快照与检查器参数。
 *
 * 这份文件被 `tsc` 编进 `lib/comment-policy.js`，打包客户端半侧时再内联进
 * `lib/client.js`，所以只能依赖纯函数，不要引入 Node 或 React。
 */
/** 文件头标签。 */
const HEADER_TAGS = ['brief', 'author', 'date', 'copyright', 'version'];
/** 函数声明标签：开关决定是否要求写出。 */
const CONTRACT_TAGS = ['param', 'returns', 'throws'];
/** 函数声明里出厂开启的补充标签。 */
const FUNCTION_EXTRA_TAGS = ['pre', 'post', 'retval'];
/** 类型标签：出厂开启，函数模板共用同一组键。 */
const TYPE_TAGS = ['tparam', 'note', 'see'];
/** 全部可选标签，快照与测试按它排序。 */
const EXTRA_TAGS = ['note', 'see', 'pre', 'post', 'tparam', 'retval'];
/** 只有用户主动填了非空值才放行的隐私标签。 */
const PRIVACY_TAGS = ['author', 'date', 'copyright', 'version'];
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
/**
 * 出厂配置：声明用 `///`，除 @file 与函数体 // 外全部开启；空值仍不写文件头。
 */
const DEFAULT_CONFIG = {
    commentStyle: 'slash',
    brief: { enabled: true, value: '' },
    author: { enabled: true, value: '' },
    date: { enabled: true, value: '' },
    copyright: { enabled: true, value: '' },
    version: { enabled: true, value: '' },
    param: true,
    returns: true,
    throws: true,
    note: true,
    see: true,
    pre: true,
    post: true,
    tparam: true,
    retval: true,
};
/**
 * 宿主把 volatile 字段交给插件时给的是可读写单元（`.get()`），设置页快照给的是普通值；
 * 两种形状都要按同一个值读取。
 */
function unwrap(value) {
    if (value !== null &&
        typeof value === 'object' &&
        typeof value.get === 'function') {
        return value.get();
    }
    return value;
}
function text(value) {
    const plain = unwrap(value);
    return typeof plain === 'string' ? plain.trim() : '';
}
function flag(value, fallback) {
    const plain = unwrap(value);
    return typeof plain === 'boolean' ? plain : fallback;
}
/** 声明符号只认两档；未知值回到 `///`。 */
function commentStyleOf(raw) {
    return unwrap(raw) === 'block' ? 'block' : 'slash';
}
/**
 * 把宿主给的值补齐成完整配置；缺字段、旧版本或手工改坏的配置都回到出厂值。
 */
function normalizeConfig(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const config = { commentStyle: commentStyleOf(source.commentStyle) };
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
/** 一行声明注释：`/// 内容` 或块注释里的 ` * 内容`。 */
function declarationLine(style, content) {
    return style === 'block' ? ` * ${content}` : `/// ${content}`;
}
/** 文件头后面的说明行：块注释里空行写成 ` *`。 */
function separatorLine(style) {
    return style === 'block' ? ' *' : '///';
}
/**
 * 按配置渲染文件头；`@file` 始终是传入的文件名，块注释按 Doxygen 结构分行。
 */
function renderFileHeader(raw, fileName) {
    const config = normalizeConfig(raw);
    const name = text(fileName) || SAMPLE_FILE;
    const lines = [`@file ${name}`];
    if (config.brief.enabled) {
        lines.push(config.brief.value ? `@brief ${config.brief.value}` : '@brief');
    }
    for (const tag of ['author', 'date', 'copyright', 'version']) {
        if (config[tag].enabled && config[tag].value)
            lines.push(`@${tag} ${config[tag].value}`);
    }
    if (config.commentStyle === 'block') {
        return ['/**', ...lines.map((line) => ` * ${line}`), ' */'];
    }
    return lines.map((line) => `/// ${line}`);
}
/**
 * 设置页的预览：文件头 + 一段函数注释，只显示当前配置会写出的标签。
 * 返回值里的 `header` 已按声明符号排好，`contract` 是每行标签的正文。
 */
function previewParts(raw, sampleName) {
    const config = normalizeConfig(raw);
    const header = renderFileHeader(config, sampleName || SAMPLE_FILE);
    // 预览是示例：@brief 开着但用户没填句子时，用示例文件自己的摘要顶替。
    const briefIndex = header.findIndex((line) => /@brief$/.test(line.trim()));
    if (briefIndex !== -1) {
        header[briefIndex] = header[briefIndex].replace(/@brief$/, `@brief ${SAMPLE_BRIEF}`);
    }
    const contract = [];
    if (config.param)
        contract.push('@param row 目标行号。');
    if (config.returns)
        contract.push('@return 放置成功时为 true。');
    if (config.throws)
        contract.push('@throws std::out_of_range 行号越界时抛出。');
    return { header, contract, declaration: '[[nodiscard]] bool Place(int row, int column);' };
}
/**
 * 设置页预览的纯文本形式；客户端半侧用同一份实现渲染 `<pre>`。
 * 块注释的每个内容行前加 ` * `，首尾各占一行。
 */
function previewText(raw, sampleName) {
    const config = normalizeConfig(raw);
    const { header, contract, declaration } = previewParts(config, sampleName);
    const style = config.commentStyle;
    const summary = '放置成功时返回 true；行号越界或目标格子已占时返回 false。';
    if (style === 'block') {
        const body = [declarationLine(style, summary)];
        if (contract.length > 0) {
            body.push(separatorLine(style), ...contract.map((line) => declarationLine(style, line)));
        }
        return [...header, '/**', ...body, ' */', declaration].join('\n');
    }
    const lines = [...header, separatorLine(style), declarationLine(style, summary)];
    if (contract.length > 0)
        lines.push(separatorLine(style), ...contract.map((line) => declarationLine(style, line)));
    lines.push(declaration);
    return lines.join('\n');
}
/**
 * 检查器参数：隐私标签要显式放行，@brief 被关掉时跳过摘要检查，
 * 声明符号切到块注释时让检查器按块注释收口。
 */
function checkerArgs(raw) {
    const config = normalizeConfig(raw);
    const args = [];
    if (config.commentStyle === 'block')
        args.push('--comment-style', 'block');
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
 * 只写一行，列出声明符号、开启与关闭的标签，避免正文膨胀。
 */
function snapshotText(raw) {
    const config = normalizeConfig(raw);
    const on = ['@file'];
    const off = [];
    for (const tag of HEADER_TAGS) {
        const entry = config[tag];
        const label = entry.value ? `${TAG_LABEL[tag]} ${entry.value}` : TAG_LABEL[tag];
        if (entry.enabled)
            on.push(label);
        else
            off.push(TAG_LABEL[tag]);
    }
    for (const tag of [...CONTRACT_TAGS, ...EXTRA_TAGS]) {
        if (config[tag])
            on.push(TAG_LABEL[tag]);
        else
            off.push(TAG_LABEL[tag]);
    }
    const style = config.commentStyle === 'block' ? '/** ... */' : '///';
    const line = `- 声明符号：${style}（函数体固定 //）；开启 ${on.join('、')}；关闭 ${off.join('、') || '无'}。`;
    return `## 当前注释配置（profile）\n\n${line}`;
}


// 客户端半侧：插件页的配置卡片（plugins.bundle.config），只此一个入口。
// 标签策略在本文件上方内联（由 scripts/building-client.mjs 从 src/comment-policy.js
// 拼进来），所以预览、默认值与服务端快照永远同源；这里只做表单与外观。
const React = require('react')
const h = React.createElement

const PACKAGE_NAME = '@chengzhao-dev/dsh-cpp-workflow'

const STRINGS = {
  zh: {
    nav: 'C++ 工程流程',
    heading: '文档注释',
    lede: '文件头、类型与函数声明各自决定默认写入哪些标签；预览随改动即时更新。',
    style: '注释符号',
    styleHint: '声明用哪种注释；函数体始终用 //。',
    bodyRow: '函数体',
    bodyPlaceholder: '固定 //',
    header: '文件头',
    headerHint: '开关打开后填写内容；空值不会写进文件。',
    type: '类型',
    typeHint: '类型块与函数模板里的补充标签。',
    declaration: '函数声明',
    declarationHint: '函数契约与前置、后置条件。',
    preview: '预览',
    previewHint: '代码块随开关和输入即时更新。',
    filePlaceholder: '跟随文件名',
    briefPlaceholder: '文件摘要：留空则各文件自写',
    authorPlaceholder: '作者署名',
    datePlaceholder: '日期',
    copyrightPlaceholder: '版权',
    versionPlaceholder: '版本',
    paramPlaceholder: '逐项说明参数',
    returnPlaceholder: '说明返回值',
    throwsPlaceholder: '列出可能抛出的异常',
    prePlaceholder: '前置条件',
    postPlaceholder: '后置条件',
    retvalPlaceholder: '按枚举值说明返回值',
    tparamPlaceholder: '说明模板参数',
    notePlaceholder: '补充说明',
    seePlaceholder: '相关接口',
    styleSlashExample: '/// @brief 定义棋盘。',
    styleBlockExample: '/** @brief 定义棋盘。 */',
    save: '保存',
    reset: '撤销修改',
    defaults: '恢复默认值',
    restored: '已填入内置默认值，点“保存”后生效。',
    saved: '已保存到 ~/.dsh/profiles/<profile>/cordis.patch.yml，下一次读取技能时生效。',
    rejected: '保存被拒绝：配置可能已在别处修改。请先撤销修改，再重新编辑。',
    unsaved: '有未保存的改动',
    loading: '正在读取配置…',
    unavailable: '这个部署没有提供这份配置。',
    unreadable: '当前账户不能修改这份配置。',
    readOnly: '这个页面暂时没有连到配置表单，下面的值是内置默认值。重启 DeepSeek Harness 后重新打开本页即可编辑。',
    reload: '重新载入页面',
    noService: '（configForms 服务未连接）',
  },
  en: {
    nav: 'C++ Workflow',
    heading: 'Doxygen comments',
    lede: 'The file header, types, and declarations each decide which tags are written by default; the preview updates as you edit.',
    style: 'Comment symbol',
    styleHint: 'Symbol for declarations; function bodies always use //.',
    bodyRow: 'Body',
    bodyPlaceholder: 'Always //',
    header: 'File header',
    headerHint: 'Turn a tag on, then fill in its value; empty values are not written.',
    type: 'Types',
    typeHint: 'Extra tags for type blocks and function templates.',
    declaration: 'Function declarations',
    declarationHint: 'Function contracts plus pre- and postconditions.',
    preview: 'Preview',
    previewHint: 'The code block updates as you toggle switches and type.',
    filePlaceholder: 'Follows the file name',
    briefPlaceholder: 'File summary: leave empty for each file',
    authorPlaceholder: 'Author',
    datePlaceholder: 'Date',
    copyrightPlaceholder: 'Copyright',
    versionPlaceholder: 'Version',
    paramPlaceholder: 'Describe each parameter',
    returnPlaceholder: 'Describe the return value',
    throwsPlaceholder: 'List exceptions that may be thrown',
    prePlaceholder: 'Precondition',
    postPlaceholder: 'Postcondition',
    retvalPlaceholder: 'Describe a named return value',
    tparamPlaceholder: 'Describe template parameters',
    notePlaceholder: 'Additional notes',
    seePlaceholder: 'Related interfaces',
    styleSlashExample: '/// @brief Defines the board.',
    styleBlockExample: '/** @brief Defines the board. */',
    save: 'Save',
    reset: 'Discard changes',
    defaults: 'Restore defaults',
    restored: 'Built-in defaults are filled in; select Save to apply them.',
    saved: 'Saved to ~/.dsh/profiles/<profile>/cordis.patch.yml; the next skill read uses it.',
    rejected: 'The host rejected the save: the config changed elsewhere. Discard your changes and edit again.',
    unsaved: 'Unsaved changes',
    loading: 'Reading configuration…',
    unavailable: 'This deployment does not serve this configuration.',
    unreadable: 'This account cannot edit the configuration.',
    readOnly: 'This page is not connected to a configuration form yet; the values below are built-in defaults. Restart DeepSeek Harness, then reopen this page to edit.',
    reload: 'Reload page',
    noService: ' (the configForms service is not connected)',
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
.dcw-page{--dcw-fg:var(--dsw-alias-label-primary,#1f2328);--dcw-muted:var(--dsw-alias-label-secondary,#69707d);--dcw-faint:var(--dsw-alias-label-tertiary,#8a919c);--dcw-border:var(--dsw-alias-border-l2,rgba(31,35,40,.14));--dcw-bg1:var(--dsw-alias-bg-layer-1,#fff);--dcw-bg2:var(--dsw-alias-bg-layer-2,rgba(31,35,40,.035));--dcw-accent:var(--dsw-alias-brand-primary,#2f6fed);--dcw-danger:var(--dsw-alias-state-error-primary,#c0392b);--dcw-success:var(--dsw-alias-state-success-primary,#1a7f37);color:var(--dcw-fg);max-width:760px;padding:2px 0 12px;font-size:13px;line-height:1.6}
.dcw-head{margin:0 0 16px}
.dcw-title{margin:0 0 6px;font-size:17px;font-weight:620;letter-spacing:.005em}
.dcw-lede{margin:0;color:var(--dcw-muted);font-size:12.5px;line-height:1.65;max-width:66ch}
.dcw-note{display:flex;gap:8px;align-items:center;margin:12px 0 0;padding:9px 11px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg2);color:var(--dcw-muted);font-size:12px;line-height:1.55}
.dcw-note[data-tone="warn"]{color:var(--dcw-danger);border-color:color-mix(in srgb,var(--dcw-danger) 35%,transparent)}
.dcw-note-dot{flex:none;width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.55}
.dcw-note-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;opacity:.8;margin-left:6px}
.dcw-note-action{margin-left:auto;flex:none;padding:3px 10px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.dcw-note-action:hover{background:var(--dcw-bg1)}
.dcw-card{margin:14px 0 0;border:1px solid var(--dcw-border);border-radius:12px;background:var(--dcw-bg1);overflow:hidden}
.dcw-card-head{padding:12px 16px 10px;border-bottom:1px solid var(--dcw-border);background:var(--dcw-bg2)}
.dcw-card-title{margin:0;font-size:13px;font-weight:620;letter-spacing:.01em}
.dcw-card-hint{margin:2px 0 0;color:var(--dcw-muted);font-size:11.5px;line-height:1.5}
.dcw-card-body{padding:0}
.dcw-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:2px 14px;min-height:48px;padding:10px 16px;border-top:1px solid var(--dcw-border)}
.dcw-card-body>.dcw-row:first-child{border-top:0}
.dcw-row-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.dcw-row-label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;color:var(--dcw-fg)}
.dcw-row-hint{color:var(--dcw-muted);font-size:11.5px;line-height:1.5}
.dcw-row-value .dcw-input{grid-column:1/-1;margin-top:8px}
.dcw-fixed-value{color:var(--dcw-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;white-space:nowrap}
.dcw-row-flag,.dcw-row-value{cursor:pointer}
.dcw-style-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px}
.dcw-style-option{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:12px 14px;border:1px solid var(--dcw-border);border-radius:10px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;text-align:left;cursor:pointer}
.dcw-style-option:hover:enabled{border-color:color-mix(in srgb,var(--dcw-fg) 30%,transparent)}
.dcw-style-option[aria-checked="true"]{border-color:var(--dcw-accent);background:color-mix(in srgb,var(--dcw-accent) 7%,var(--dcw-bg1));box-shadow:inset 0 0 0 1px var(--dcw-accent)}
.dcw-style-option:focus-visible{outline:2px solid var(--dcw-accent);outline-offset:2px}
.dcw-style-option:disabled{opacity:.5;cursor:default}
.dcw-style-symbol{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;font-weight:620}
.dcw-style-example{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.55;color:var(--dcw-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dcw-switch{position:relative;display:inline-flex;align-items:center;flex:none;width:40px;height:22px;cursor:pointer}
.dcw-switch input{position:absolute;inset:0;margin:0;opacity:0;cursor:pointer}
.dcw-track{position:absolute;inset:0;border-radius:999px;background:color-mix(in srgb,var(--dcw-fg) 20%,transparent);transition:background .16s ease}
.dcw-knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .16s ease}
.dcw-switch input:checked + .dcw-track{background:var(--dcw-accent)}
.dcw-switch input:checked + .dcw-track .dcw-knob{transform:translateX(18px)}
.dcw-switch input:focus-visible + .dcw-track{outline:2px solid var(--dcw-accent);outline-offset:2px}
.dcw-switch input:disabled + .dcw-track{opacity:.4}
.dcw-switch input:disabled{cursor:default}
.dcw-input{width:100%;min-width:0;height:36px;padding:0 11px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;font-size:12.5px}
.dcw-input::placeholder{color:var(--dcw-faint)}
.dcw-input:focus{outline:none;border-color:var(--dcw-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--dcw-accent) 16%,transparent)}
.dcw-input:disabled{opacity:.55}
.dcw-preview{margin:0;border-top:1px solid var(--dcw-border)}
.dcw-preview-head{display:flex;align-items:center;gap:7px;padding:8px 14px;border-bottom:1px solid var(--dcw-border);background:var(--dcw-bg2);color:var(--dcw-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px}
.dcw-preview-dot{width:6px;height:6px;border-radius:50%;background:var(--dcw-faint)}
.dcw-preview-body{margin:0;padding:12px 14px 14px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.7;white-space:pre;color:var(--dcw-fg)}
.dcw-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:16px;padding:12px 0 4px;border-top:1px solid var(--dcw-border)}
.dcw-btn{height:32px;padding:0 14px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;font-size:12.5px;cursor:pointer}
.dcw-btn:hover:enabled{border-color:color-mix(in srgb,var(--dcw-fg) 32%,transparent)}
.dcw-btn:focus-visible{outline:2px solid var(--dcw-accent);outline-offset:1px}
.dcw-btn:disabled{opacity:.45;cursor:default}
.dcw-btn-primary{background:var(--dcw-accent);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
.dcw-btn-primary:hover:enabled{filter:brightness(1.06)}
.dcw-status{flex:1 1 180px;margin:0;min-height:20px;color:var(--dcw-muted);font-size:12px}
.dcw-status[data-tone="warn"]{color:var(--dcw-danger)}
.dcw-status[data-tone="ok"]{color:var(--dcw-success)}
@media (max-width:520px){.dcw-style-options{grid-template-columns:1fr}.dcw-row{grid-template-columns:minmax(0,1fr) auto}.dcw-row-value .dcw-input{grid-column:1/-1}}
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
    'label',
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

/** 设置页的分组卡片：标题下一句说明，正文按行排控件。 */
function Section(props) {
  return h(
    'section',
    { className: 'dcw-card' },
    h(
      'div',
      { className: 'dcw-card-head' },
      h('h4', { className: 'dcw-card-title' }, props.title),
      props.hint ? h('p', { className: 'dcw-card-hint' }, props.hint) : null,
    ),
    h('div', { className: 'dcw-card-body' }, props.children),
  )
}

/** 文件头可填写的一行：标题与开关一行，输入框整行在下；关闭时收起输入框。 */
function ValueRow(props) {
  const entry = props.entry
  return h(
    'div',
    {
      className: 'dcw-row dcw-row-value',
      onClick: (event) => {
        if (props.disabled) return
        if (event.target.closest('.dcw-switch, .dcw-input')) return
        props.onChange({ ...entry, enabled: !entry.enabled })
      },
    },
    h(
      'div',
      { className: 'dcw-row-main' },
      h('span', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
    ),
    h(Switch, {
      label: TAG_LABEL[props.tag],
      checked: entry.enabled,
      disabled: props.disabled,
      onChange: (enabled) => props.onChange({ ...entry, enabled }),
    }),
    entry.enabled
      ? h('input', {
          className: 'dcw-input',
          type: 'text',
          value: entry.value,
          placeholder: props.placeholder,
          disabled: props.disabled,
          'aria-label': `${TAG_LABEL[props.tag]} 的值`,
          onChange: (event) => props.onChange({ ...entry, value: event.target.value }),
        })
      : null,
  )
}

/** 只有开关的标签行；说明放在标题下面，不再放一个不可用的假输入框。 */
function FlagRow(props) {
  return h(
    'div',
    {
      className: 'dcw-row dcw-row-flag',
      onClick: (event) => {
        if (props.disabled) return
        if (event.target.closest('.dcw-switch, .dcw-input')) return
        props.onChange(!props.checked)
      },
    },
    h(
      'div',
      { className: 'dcw-row-main' },
      h('span', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
      props.hint ? h('span', { className: 'dcw-row-hint' }, props.hint) : null,
    ),
    h(Switch, {
      label: TAG_LABEL[props.tag],
      checked: props.checked,
      disabled: props.disabled,
      onChange: props.onChange,
    }),
  )
}

/** 值由文件或语法固定的行：右侧写成普通文本，不放锁图标。 */
function LockRow(props) {
  return h(
    'div',
    { className: 'dcw-row dcw-row-fixed' },
    h(
      'div',
      { className: 'dcw-row-main' },
      h('span', { className: 'dcw-row-label' }, props.label),
    ),
    h('span', { className: 'dcw-fixed-value' }, props.value),
  )
}

/** 两种声明注释符号：两张等宽卡片，上面符号、下面示例。 */
function StyleRow(props) {
  const options = [
    { value: 'slash', symbol: '///', example: props.slashExample },
    { value: 'block', symbol: '/** */', example: props.blockExample },
  ]
  return h(
    'div',
    { className: 'dcw-style-options', role: 'radiogroup', 'aria-label': props.label },
    options.map((option) =>
      h(
        'button',
        {
          key: option.value,
          type: 'button',
          role: 'radio',
          'aria-checked': props.value === option.value ? 'true' : 'false',
          className: 'dcw-style-option',
          disabled: props.disabled,
          onClick: () => props.onChange(option.value),
        },
        h('span', { className: 'dcw-style-symbol' }, option.symbol),
        h('span', { className: 'dcw-style-example' }, option.example),
      ),
    ),
  )
}

function Preview(props) {
  const s = props.strings
  return h(
    Section,
    { title: s.preview, hint: s.previewHint },
    h(
      'div',
      { className: 'dcw-preview' },
      h('div', { className: 'dcw-preview-head' }, h('span', { className: 'dcw-preview-dot' }), SAMPLE_FILE),
      h('pre', { className: 'dcw-preview-body' }, previewText(props.config, SAMPLE_FILE)),
    ),
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

// 配置卡片本身：状态机、保存/撤销/恢复默认值，以及组合包条目里的挂点。
// 分片按 scripts/building-client.mjs 的模块表顺序拼接：shell → text → styles →
// widgets → form-state → 本文件。分片共享同一个工厂作用域，不要各自 require。

// 宿主组合包 cordis.patch.yml 插入的 profile 条目 id；设置服务按它定位表单。
const ENTRY_ID = 'cpp-workflow'
// configForms 可能晚于本插件挂载；页面在首次绘制后短暂重试，拿不到再给手动恢复入口。
const FORM_RETRY_MS = 500
const MAX_FORM_RETRIES = 20

/** 文件头可填写标签的占位文字；顺序与 HEADER_TAGS 一致。 */
const HEADER_PLACEHOLDER = {
  brief: 'briefPlaceholder',
  author: 'authorPlaceholder',
  date: 'datePlaceholder',
  copyright: 'copyrightPlaceholder',
  version: 'versionPlaceholder',
}

/** 只有开关的标签按区块取占位文字。 */
const FLAG_PLACEHOLDER = {
  param: 'paramPlaceholder',
  returns: 'returnPlaceholder',
  throws: 'throwsPlaceholder',
  pre: 'prePlaceholder',
  post: 'postPlaceholder',
  retval: 'retvalPlaceholder',
  tparam: 'tparamPlaceholder',
  note: 'notePlaceholder',
  see: 'seePlaceholder',
}

function ConfigPage(props) {
  const s = t()
  ensureStyles()
  // form 由挂点注入；resolveForm 兜住“服务晚到”的部署，拿到后下一次绘制自动接上。
  const form = props.form || (typeof props.resolveForm === 'function' ? props.resolveForm() : undefined)
  const state = useFormSnapshot(form)
  const initial = React.useMemo(() => normalizeConfig(state.value), [])
  const [draft, setDraft] = React.useState(initial)
  const [base, setBase] = React.useState(initial)
  const [dirty, setDirty] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [tone, setTone] = React.useState('')
  const [attempt, setAttempt] = React.useState(0)
  const revision = state.revision
  // 快照只有 status / writable / revision；旧版本多出来的 mode 字段已不存在，
  // 再按它判断会把所有可写表单误判成只读。
  const ready = Boolean(form && state.status === 'ready' && state.writable)
  const status = state.status
  const missing = !form

  React.useEffect(() => {
    if (dirty || state.status !== 'ready') return
    const next = normalizeConfig(state.value)
    setBase(next)
    setDraft(next)
  }, [revision, status, dirty, form, state.value])

  React.useEffect(() => {
    if (form || attempt >= MAX_FORM_RETRIES || typeof setTimeout !== 'function') return undefined
    const timer = setTimeout(() => setAttempt((value) => value + 1), FORM_RETRY_MS)
    return () => clearTimeout(timer)
  }, [form, attempt])

  // 脏标记按与已保存值的差集算：把开关关了又开回原值时，页面不该再说“有未保存的改动”。
  const update = (patch) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    setDirty(diffOperations(next, base).length > 0)
    setMessage('')
    setTone('')
  }

  // 撤销：回到最近一次从宿主读到的值，不写盘。
  const reset = () => {
    setDraft(base)
    setDirty(false)
    setMessage('')
    setTone('')
  }

  // 恢复默认值：只填进草稿，点“保存”后才写盘，避免误触直接覆盖已保存的配置。
  const restoreDefaults = () => {
    const next = normalizeConfig(DEFAULT_CONFIG)
    setDraft(next)
    setDirty(diffOperations(next, base).length > 0)
    setMessage(s.restored)
    setTone('')
  }

  const reload = () => {
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      window.location.reload()
    }
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
        // 被拒时宿主已刷新镜像；把基准对齐到新快照，撤销才不会回到过期值。
        const fresh = snapshotOf(form)
        if (fresh && fresh.status === 'ready') setBase(normalizeConfig(fresh.value))
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

  /** 一个标签一行：标题与说明，右侧开关。 */
  const flag = (tag, checked) =>
    h(FlagRow, {
      key: tag,
      tag,
      checked,
      disabled,
      hint: s[FLAG_PLACEHOLDER[tag]],
      onChange: (value) => update({ [tag]: value }),
    })

  return h(
    'div',
    { className: 'dcw-page' },
    h(
      'header',
      { className: 'dcw-head' },
      h('h3', { className: 'dcw-title' }, s.heading),
      h('p', { className: 'dcw-lede' }, s.lede),
    ),
    missing
      ? h(
          'div',
          { className: 'dcw-note', role: 'status', 'data-tone': 'warn' },
          h('span', { className: 'dcw-note-dot' }),
          h(
            'span',
            null,
            s.readOnly,
            props.hasService === false ? h('span', { className: 'dcw-note-code' }, s.noService) : null,
          ),
          h('button', { type: 'button', className: 'dcw-note-action', onClick: reload }, s.reload),
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
      Section,
      { title: s.style, hint: s.styleHint },
      h(StyleRow, {
        label: s.style,
        value: draft.commentStyle,
        disabled,
        slashExample: s.styleSlashExample,
        blockExample: s.styleBlockExample,
        onChange: (value) => update({ commentStyle: value }),
      }),
      h(LockRow, { label: s.bodyRow, value: s.bodyPlaceholder }),
    ),
    h(
      Section,
      { title: s.header, hint: s.headerHint },
      h(LockRow, { label: TAG_LABEL.file, value: s.filePlaceholder }),
      ...HEADER_TAGS.map((tag) =>
        h(ValueRow, {
          key: tag,
          tag,
          entry: draft[tag],
          disabled,
          placeholder: s[HEADER_PLACEHOLDER[tag]],
          onChange: (entry) => update({ [tag]: entry }),
        }),
      ),
    ),
    h(Section, { title: s.type, hint: s.typeHint }, ...TYPE_TAGS.map((tag) => flag(tag, draft[tag]))),
    h(
      Section,
      { title: s.declaration, hint: s.declarationHint },
      ...[...CONTRACT_TAGS, ...FUNCTION_EXTRA_TAGS].map((tag) => flag(tag, draft[tag])),
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
            'button',
            { type: 'button', className: 'dcw-btn', onClick: restoreDefaults, disabled: busy || !ready },
            s.defaults,
          ),
          h('p', { className: 'dcw-status', role: 'status', 'data-tone': tone }, message || (dirty ? s.unsaved : '')),
        )
      : null,
  )
}

function page(ownerProps, form, resolveForm, hasService) {
  return h(ConfigPage, { ...(ownerProps || {}), form, resolveForm, hasService })
}

function apply(ctx) {
  // 每次取表单都重新查询服务：宿主可能在本插件之后才挂载 configForms。
  const resolveForm = () => {
    if (!ctx.configForms || typeof ctx.configForms.get !== 'function') return undefined
    try {
      return ctx.configForms.get(ENTRY_ID)
    } catch {
      return undefined
    }
  }
  const hasService = Boolean(ctx.configForms && typeof ctx.configForms.get === 'function')
  const mount = () =>
    ctx.slots.inject('plugins.bundle.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.bundle.config',
          key: PACKAGE_NAME,
          label: () => t().nav,
        },
        (ownerProps) =>
          ownerProps && ownerProps.view === 'summary'
            ? null
            : page(ownerProps, undefined, resolveForm, hasService),
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

    return module.exports
  },
})
