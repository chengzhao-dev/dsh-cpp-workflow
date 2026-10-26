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

## 2026-10-26 边界、通用性与 token 的补充调研

这一轮为「表格与插件瘦身」重查了宿主技能子系统、Agent Skills 公开材料、下载榜头部插件和渐进披露插件。结论只用于约束本仓的形状，不据此新增依赖。

### 宿主技能子系统

来源：<https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills>（2026-10-26 取到）。

- 常驻目录只有 `name`、`description`（可选 `whenToUse`），`description` 默认截断在 500 字符；正文不进目录，`get()` 每次重读。
- 本地扫描 rank：`project-dsh` 100、`project-agents` 200、`custom` 300、`user-dsh` 400、`user-agents` 500、`bundled` 600；同层内才按 rank、provider 注册序、本地序决胜，跨层是更近的层直接覆盖。
- 名称 kebab-case；只接受 `<name>/SKILL.md` 或 `<name>.md`，不递归 `**/SKILL.md`；provider 名在同一层内唯一。
- 采用：三个技能继续保持独立目录，rank 低于项目层；三个 `description` 是唯一常驻成本，写触发条件而不是四步摘要；`standards/` 只打开项目技能声明的那一档。
- 采用：`examples/comments.md` 已拆成 `comments-declaration.md` 与 `comments-implementation.md`，步骤分别点名，避免改声明时读完整份实现案例。

### 渐进披露与 token

- Anthropic《Equipping agents…》<https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills>：启动只预载名称与描述，正文按相关性读取，脚本可直接执行而不读入上下文；原文「If certain contexts are mutually exclusive or rarely used together, keeping the paths separate will reduce the token usage.」
- [dsh-skill-tier](https://dsh-plugin.org/plugins/pandarayc/dsh-skill-tier)：把 28 个成员的目录从 2,901 token 折成 119 token（约 96%），Tier 0 索引约 +78 至 +121 token，`rank` 默认 350，零依赖、单文件、未配置时零候选；其 FAQ 明确成员目录不能再作扫描根、同层重复 provider 不激活、超过 500 字符的描述会被截断。
- 采用：三个 `SKILL.md` 各写「本轮只开当前步」；条文只开该步点名的一份；`checking-comments.mjs` 等脚本执行，不把源码读进上下文。
- 不采用：为每个 target 生成技能或为每个标准档建索引；技能数量少，生成层只会多一次发现与失效。

### 头部插件的边界与联动

数据：<https://www.dsh.so/data/npm-downloads.json>（`generatedAt` 2026-10-26T00:11:21Z，`snapshotDate` 2026-10-25，窗口 10-18 至 10-25，CC-BY-4.0）。前 100 名没有包名含 `cpp`、`cmake`、`clang`、`quarto`、`ninja` 的插件。

- [billion-context](https://registry.npmjs.org/billion-context/latest)（第 1）：只声明 `dsh.bundle.patch` 与 `dsh.client.platform=web`，没有 `peerDependencies`，也不锁 `engines.dsh`；关键词跨 Claude Code、Codex、Cursor 等宿主。
- `@T-Auto/dsh-ops`（第 7）、`@nanmicoder/dsh-agent-teams`（第 21）：用 peer 范围锚定 `@deepseek-ai/dsh*`，`dsh.client.inject` 只列自己真正接管的模块。
- `@michengai/dsh-code-review`（第 53）：独立上下文读取 Git、相关代码与测试，「不提前注入全仓代码快照」。
- 采用：C++ 插件只声明技能能力面，不接管构建、终端或权限；与 `dsh-cpp-workflow` 项目的阶段表通过项目技能衔接，不互相探测；审查交给子代理，不把全仓源码注入。
- 不采用：把 CMake 解析、编译器探测、LSP 索引搬进技能正文；这些属于工具与子代理，不是指令。
