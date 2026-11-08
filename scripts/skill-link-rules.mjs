// 结构检查器与其测试共用的包闭包规则。
//
// 只有目标位于 npm `files` 白名单内，Markdown 链接才算安全。目录项覆盖整棵
// 子树；匹配必须停在路径分隔符，避免把 `skills-extra/` 当成 `skills/` 的一部分。

/** @param {string} relativePath 仓库相对路径，允许正反斜杠。 */
/** @param {readonly string[]} files npm `files` 白名单项。 */
export function isPackagedPath(relativePath, files = []) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '')
  return files.some((entry) => {
    const root = entry.replaceAll('\\', '/').replace(/\/+$/, '')
    return normalized === root || normalized.startsWith(`${root}/`)
  })
}
