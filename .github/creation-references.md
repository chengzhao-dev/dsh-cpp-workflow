# 创建依据

本文件只记录官方 DSH 文档和 dsh.so 周榜。实现按这些公开契约写，不复制其他插件的正文、包名或技能名。

## 官方文档

| 主题 | 地址 | 采用的事实 |
| --- | --- | --- |
| 插件总览 | <https://deepseek-harness.github.io/deepseek-harness/develop/basic/index.md> | 最小插件由 `package.json`、入口和可选补丁组成；入口导出 `name`、`inject`、`apply` |
| 打包与安装 | <https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish.md> | 组合包声明 `dsh.bundle.patch`；补丁是 YAML 数组，`insert` 行按包名引用；npm 安装使用预构建 `lib/`；从 Git 安装若仓库未提交构建产物，才需要自包含 `prepare`（本包提交了 `lib/`，因此不设 `prepare`） |
| 技能子系统 | <https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/skills.md> | `ctx.skills.registerProvider(create)`；`list(options)` 返回候选；`get(candidate, options)` 返回含 `content` 的定义；rank 表；本地提供方只接受 `<name>/SKILL.md` 或 `<name>.md` |
| 插件市场索引 | <https://deepseek-harness.github.io/deepseek-harness/guide/plugin-market.md> | 市场 `index.json` 的 `metadata.category/labels/sortKeys` 与 `versions[].source`；这是市场索引，不是包内元数据 |
| 文档索引 | <https://deepseek-harness.github.io/deepseek-harness/llms.txt> | 上述页面的入口 |

`dsh.catalog` 是本包保留的包内声明；当前官方页面没有把它列为宿主运行时字段，因此实现保留该声明，但不把任何行为建立在该字段会被消费上。

## dsh.so 周榜

- 数据：<https://www.dsh.so/data/npm-downloads.json>
- `generatedAt`：2026-10-21T00:08:41.748Z
- `snapshotDate`：2026-10-20
- 统计窗口：2026-10-13 至 2026-10-20
- `limit`：100
- 来源：dsh.so
- 许可：CC-BY-4.0

观察：这一百名里没有包名含 `cpp`、`cmake`、`clang` 或 `lsp` 的插件。前十五名以上下文、市场、侧栏、宠物、皮肤和连接器为主。该榜只用于确认包形和安装方式，不作为复制正文或依赖其他插件的依据。
