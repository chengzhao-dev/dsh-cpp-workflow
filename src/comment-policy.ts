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

/** 声明注释的符号：`///` 或 Doxygen 块注释。 */
export type CommentStyle = 'slash' | 'block'

/** 文件头标签：每项一个开关与一个默认值，@file 固定为文件名。 */
export interface HeaderTagConfig {
  enabled: boolean
  value: string
}

/** 完整配置：文件头五项带值，其余标签只有开关。 */
export interface CommentConfig extends Record<string, unknown> {
  commentStyle: CommentStyle
  brief: HeaderTagConfig
  author: HeaderTagConfig
  date: HeaderTagConfig
  copyright: HeaderTagConfig
  version: HeaderTagConfig
  param: boolean
  returns: boolean
  throws: boolean
  note: boolean
  see: boolean
  pre: boolean
  post: boolean
  tparam: boolean
  retval: boolean
}

/** 文件头标签。 */
export const HEADER_TAGS = ['brief', 'author', 'date', 'copyright', 'version'] as const

/** 函数声明标签：开关决定是否要求写出。 */
export const CONTRACT_TAGS = ['param', 'returns', 'throws'] as const

/** 函数声明里出厂开启的补充标签。 */
export const FUNCTION_EXTRA_TAGS = ['pre', 'post', 'retval'] as const

/** 类型标签：出厂开启，函数模板共用同一组键。 */
export const TYPE_TAGS = ['tparam', 'note', 'see'] as const

/** 全部可选标签，快照与测试按它排序。 */
export const EXTRA_TAGS = ['note', 'see', 'pre', 'post', 'tparam', 'retval'] as const

/** 只有用户主动填了非空值才放行的隐私标签。 */
export const PRIVACY_TAGS = ['author', 'date', 'copyright', 'version'] as const

/** 开关型标签在设置页的标题。 */
export const TAG_LABEL: Record<string, string> = {
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
}

/** 预览里的示例摘要：用户没填 @brief 时用它，避免预览出现空标签。 */
export const SAMPLE_BRIEF = '<一句话说明本文件>'

/** 预览里的示例文件名：只是占位符，不对应任何工程的真实文件。 */
export const SAMPLE_FILE = '<文件名>'

/**
 * 出厂配置：声明用 `///`，除 @file 与函数体 // 外全部开启；空值仍不写文件头。
 */
export const DEFAULT_CONFIG: CommentConfig = {
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
}

/**
 * 宿主把 volatile 字段交给插件时给的是可读写单元（`.get()`），设置页快照给的是普通值；
 * 两种形状都要按同一个值读取。
 */
function unwrap(value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { get?: unknown }).get === 'function'
  ) {
    return (value as { get: () => unknown }).get()
  }
  return value
}

function text(value: unknown): string {
  const plain = unwrap(value)
  return typeof plain === 'string' ? plain.trim() : ''
}

function flag(value: unknown, fallback: boolean): boolean {
  const plain = unwrap(value)
  return typeof plain === 'boolean' ? plain : fallback
}

/** 声明符号只认两档；未知值回到 `///`。 */
export function commentStyleOf(raw: unknown): CommentStyle {
  return unwrap(raw) === 'block' ? 'block' : 'slash'
}

/**
 * 把宿主给的值补齐成完整配置；缺字段、旧版本或手工改坏的配置都回到出厂值。
 */
export function normalizeConfig(raw?: unknown): CommentConfig {
  const source: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const config: Record<string, unknown> = { commentStyle: commentStyleOf(source.commentStyle) }
  for (const tag of HEADER_TAGS) {
    const entry = source[tag] && typeof source[tag] === 'object' ? (source[tag] as Record<string, unknown>) : {}
    config[tag] = {
      enabled: flag(entry.enabled, DEFAULT_CONFIG[tag].enabled),
      value: text(entry.value),
    }
  }
  for (const tag of [...CONTRACT_TAGS, ...EXTRA_TAGS]) {
    config[tag] = flag(source[tag], DEFAULT_CONFIG[tag] as boolean)
  }
  return config as CommentConfig
}

/** 一行声明注释：`/// 内容` 或块注释里的 ` * 内容`。 */
function declarationLine(style: CommentStyle, content: string): string {
  return style === 'block' ? ` * ${content}` : `/// ${content}`
}

/** 文件头后面的说明行：块注释里空行写成 ` *`。 */
function separatorLine(style: CommentStyle): string {
  return style === 'block' ? ' *' : '///'
}

/**
 * 按配置渲染文件头；`@file` 始终是传入的文件名，块注释按 Doxygen 结构分行。
 */
export function renderFileHeader(raw: unknown, fileName: string): string[] {
  const config = normalizeConfig(raw)
  const name = text(fileName) || SAMPLE_FILE
  const lines = [`@file ${name}`]
  if (config.brief.enabled) {
    lines.push(config.brief.value ? `@brief ${config.brief.value}` : '@brief')
  }
  for (const tag of ['author', 'date', 'copyright', 'version'] as const) {
    if (config[tag].enabled && config[tag].value) lines.push(`@${tag} ${config[tag].value}`)
  }
  if (config.commentStyle === 'block') {
    return ['/**', ...lines.map((line) => ` * ${line}`), ' */']
  }
  return lines.map((line) => `/// ${line}`)
}

/**
 * 设置页的预览：文件头 + 一段函数注释，只显示当前配置会写出的标签。
 * 返回值里的 `header` 已按声明符号排好，`contract` 是每行标签的正文。
 */
export function previewParts(
  raw: unknown,
  sampleName?: string,
): { header: string[]; contract: string[]; declaration: string } {
  const config = normalizeConfig(raw)
  const header = renderFileHeader(config, sampleName || SAMPLE_FILE)
  // 预览是示例：@brief 开着但用户没填句子时，用示例文件自己的摘要顶替。
  const briefIndex = header.findIndex((line) => /@brief$/.test(line.trim()))
  if (briefIndex !== -1) {
    header[briefIndex] = header[briefIndex].replace(/@brief$/, `@brief ${SAMPLE_BRIEF}`)
  }
  const contract: string[] = []
  if (config.param) contract.push('@param row 目标行号。')
  if (config.returns) contract.push('@return 放置成功时为 true。')
  if (config.throws) contract.push('@throws std::out_of_range 行号越界时抛出。')
  return { header, contract, declaration: '[[nodiscard]] bool Place(int row, int column);' }
}

/**
 * 设置页预览的纯文本形式；客户端半侧用同一份实现渲染 `<pre>`。
 * 块注释的每个内容行前加 ` * `，首尾各占一行。
 */
export function previewText(raw: unknown, sampleName?: string): string {
  const config = normalizeConfig(raw)
  const { header, contract, declaration } = previewParts(config, sampleName)
  const style = config.commentStyle
  const summary = '放置成功时返回 true；行号越界或目标格子已占时返回 false。'
  if (style === 'block') {
    const body = [declarationLine(style, summary)]
    if (contract.length > 0) {
      body.push(separatorLine(style), ...contract.map((line) => declarationLine(style, line)))
    }
    return [...header, '/**', ...body, ' */', declaration].join('\n')
  }
  const lines = [...header, separatorLine(style), declarationLine(style, summary)]
  if (contract.length > 0) lines.push(separatorLine(style), ...contract.map((line) => declarationLine(style, line)))
  lines.push(declaration)
  return lines.join('\n')
}

/**
 * 检查器参数：隐私标签要显式放行，@brief 被关掉时跳过摘要检查，
 * 声明符号切到块注释时让检查器按块注释收口。
 */
export function checkerArgs(raw: unknown): string[] {
  const config = normalizeConfig(raw)
  const args: string[] = []
  if (config.commentStyle === 'block') args.push('--comment-style', 'block')
  if (!config.brief.enabled) args.push('--no-brief')
  for (const tag of PRIVACY_TAGS) {
    if (config[tag].enabled && config[tag].value) args.push('--allow-tag', tag)
  }
  return args
}

/**
 * 技能快照：`get()` 把它接在技能正文末尾，让代理看到当前 profile 的标签开关。
 * 只写一行，列出声明符号、开启与关闭的标签，避免正文膨胀。
 */
export function snapshotText(raw: unknown): string {
  const config = normalizeConfig(raw)
  const on: string[] = ['@file']
  const off: string[] = []
  for (const tag of HEADER_TAGS) {
    const entry = config[tag]
    const label = entry.value ? `${TAG_LABEL[tag]} ${entry.value}` : TAG_LABEL[tag]
    if (entry.enabled) on.push(label)
    else off.push(TAG_LABEL[tag])
  }
  for (const tag of [...CONTRACT_TAGS, ...EXTRA_TAGS]) {
    if (config[tag]) on.push(TAG_LABEL[tag])
    else off.push(TAG_LABEL[tag])
  }
  const style = config.commentStyle === 'block' ? '/** ... */' : '///'
  const line = `- 声明符号：${style}（函数体固定 //）；开启 ${on.join('、')}；关闭 ${off.join('、') || '无'}。`
  return `## 当前注释配置（profile）\n\n${line}`
}
