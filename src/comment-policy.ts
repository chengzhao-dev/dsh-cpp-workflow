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

/** 文件头标签：每项一个开关与一个默认值，@file 固定为文件名。 */
export interface HeaderTagConfig {
  enabled: boolean
  value: string
}

/** 完整配置：文件头五项带值，其余标签只有开关。 */
export interface CommentConfig extends Record<string, unknown> {
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

/** 函数契约标签：开关决定是否要求写出。 */
export const CONTRACT_TAGS = ['param', 'returns', 'throws'] as const

/** 折叠在「更多标签」里的可选标签：默认关闭。 */
export const EXTRA_TAGS = ['note', 'see', 'pre', 'post', 'tparam', 'retval'] as const

/** 只有用户主动填了非空值才放行的隐私标签。 */
export const PRIVACY_TAGS = ['author', 'date', 'copyright', 'version'] as const

/** 标签说明：设置页逐行显示，用作行的辅助文字。 */
export const TAG_TEXT: Record<string, string> = {
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
}

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

/** 出厂配置：文件头只留 @file 与 @brief，契约标签全开，隐私标签全关。 */
export const DEFAULT_CONFIG: CommentConfig = {
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

/**
 * 把宿主给的值补齐成完整配置；缺字段、旧版本或手工改坏的配置都回到出厂值。
 */
export function normalizeConfig(raw?: unknown): CommentConfig {
  const source: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const config: Record<string, unknown> = {}
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

/**
 * 按配置渲染文件头；`@file` 始终是传入的文件名。
 */
export function renderFileHeader(raw: unknown, fileName: string): string[] {
  const config = normalizeConfig(raw)
  const name = text(fileName) || SAMPLE_FILE
  const lines = [`/// @file ${name}`]
  if (config.brief.enabled) {
    lines.push(config.brief.value ? `/// @brief ${config.brief.value}` : '/// @brief')
  }
  for (const tag of ['author', 'date', 'copyright', 'version'] as const) {
    if (config[tag].enabled && config[tag].value) lines.push(`/// @${tag} ${config[tag].value}`)
  }
  return lines
}

/**
 * 设置页的预览：文件头 + 一段函数注释，只显示当前配置会写出的标签。
 */
export function previewParts(
  raw: unknown,
  sampleName?: string,
): { header: string[]; contract: string[]; declaration: string } {
  const config = normalizeConfig(raw)
  const header = renderFileHeader(config, sampleName || SAMPLE_FILE)
  // 预览是示例：@brief 开着但用户没填句子时，用示例文件自己的摘要顶替。
  const briefIndex = header.indexOf('/// @brief')
  if (briefIndex !== -1) header[briefIndex] = `/// @brief ${SAMPLE_BRIEF}`
  const contract: string[] = []
  if (config.param) contract.push('/// @param row 目标行号。')
  if (config.returns) contract.push('/// @return 放置成功时为 true。')
  if (config.throws) contract.push('/// @throws std::out_of_range 行号越界时抛出。')
  const declaration = '[[nodiscard]] bool Place(int row, int column);'
  return { header, contract, declaration }
}

/**
 * 设置页预览的纯文本形式；客户端半侧用同一份实现渲染 `<pre>`。
 */
export function previewText(raw: unknown, sampleName?: string): string {
  const { header, contract, declaration } = previewParts(raw, sampleName)
  const lines = [...header, '///', '/// 放置成功时返回 true；行号越界或目标格子已占时返回 false。']
  if (contract.length > 0) lines.push('///', ...contract)
  lines.push(declaration)
  return lines.join('\n')
}

/**
 * 检查器参数：隐私标签要显式放行，@brief 被关掉时跳过摘要检查。
 */
export function checkerArgs(raw: unknown): string[] {
  const config = normalizeConfig(raw)
  const args: string[] = []
  if (!config.brief.enabled) args.push('--no-brief')
  for (const tag of PRIVACY_TAGS) {
    if (config[tag].enabled && config[tag].value) args.push('--allow-tag', tag)
  }
  return args
}

/**
 * 技能快照：`get()` 把它接在技能正文末尾，让代理看到当前 profile 的标签开关。
 */
export function snapshotText(raw: unknown): string {
  const config = normalizeConfig(raw)
  const on: string[] = []
  const off: string[] = []
  for (const tag of HEADER_TAGS) {
    const entry = config[tag]
    const label = entry.value ? `${TAG_LABEL[tag]} ${entry.value}` : TAG_LABEL[tag]
    if (entry.enabled) on.push(label)
    else off.push(TAG_LABEL[tag])
  }
  const contract = CONTRACT_TAGS.filter((tag) => config[tag]).map((tag) => TAG_LABEL[tag])
  const extra = EXTRA_TAGS.filter((tag) => config[tag]).map((tag) => TAG_LABEL[tag])
  const allowed = PRIVACY_TAGS.filter((tag) => config[tag].enabled && config[tag].value)
  const head = `## 当前注释配置（profile）\n\n`
  const body = [
    `- 文件头：@file 固定为文件名；开启 ${on.join('、') || '无'}；关闭 ${off.join('、') || '无'}。`,
    `- 函数契约：${contract.length > 0 ? contract.join('、') : '不要求'}。`,
    `- 更多标签：${extra.length > 0 ? `可选 ${extra.join('、')}` : '未启用'}。`,
    `- 检查器放行：${allowed.length > 0 ? allowed.join('、') : '无'}（隐私标签只有填了非空值才放行）。`,
  ]
  return head + body.join('\n')
}
