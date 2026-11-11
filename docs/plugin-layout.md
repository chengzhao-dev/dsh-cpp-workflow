# 包布局

这个包只发布白名单里的文件；目录树与逐文件清单见 [module-layout.md](module-layout.md)。分层与加载顺序见 [architecture.md](architecture.md)，触发判据见 [triggering.md](triggering.md)。

## 进包白名单

`package.json` 的 `files` 字段：

```json
[
  "lib",
  "skills",
  "cordis.patch.yml",
  "locale",
  "icon.svg",
  "README.md",
  "README.en.md",
  "LICENSE",
  "templates"
]
```

`lib/` 是构建产物，源码在 `src/`；`docs/`、`tests/`、`scripts/` 与 `temp/` 不进包。安装后仍按 `skills/<name>/SKILL.md` 发现技能。运行时不写盘、不建缓存，证据与守卫见 [plugin-storage.md](plugin-storage.md)。

## 体量与对照

三份 `SKILL.md` 分别为 `developing-cpp` 94 行、`engineering` 87 行、`building-cpp` 85 行，文件字符数合计 14,978（约 8.2k tokens；只有目录行常驻）；最大的 reference 是 `skills/developing-cpp/references/exceptions/01-exception-rules.md` 208 行（正文 207 行），其余按主题拆成单文件、由正文点名后按需读取。Agent Skills 规范建议正文控制在 500 行以内、references 保持聚焦；抽到的 4 个带技能包中，`dsh-univer-office` 有 12 个 `SKILL.md`、12–261 行（最短两份 12–13 行），`dsh-image-gen` 22 行，`modlens` 59 行，`modsearch` 137 行；本包把细节放在 references 里，正文只留入口、步骤与完成判据。

目录消息只带 `name` 与 `description`，DSH 默认在 500 字符处截断；三份 description 分别为 `building-cpp` 197、`developing-cpp` 143、`engineering` 198 字符，触发条件与常见症状写在句子里，未依赖 `whenToUse` 字段兜底（该字段仍会随候选一起返回）。插件 rank 是 550：近层同名先直接胜出，rank 只在同一层内决胜；本项目与用户目录的 200、500 两档都排在它前面，本包不注册根技能。

## 与下载量前 100 的对照

数据来自 [awesome-dsh-plugin 的 plugins.json](https://awesome-dsh-plugin.com/plugins.json)（快照 2026-11-08；下载窗口 2026-10-08 至 2026-11-06，30 天）。索引 9463 个插件，4759 个有下载数；前 100 名下载量中位 40,803，榜首 `billion-context` 3,033,041。前 20 名里工具、UI、主题、会话与记忆类占多数；带 `skills/` 的包 11 个（`dsh-univer-office` 12 个、`dsh-windows2macos` 4 个，其余各 1 个），索引 `category=skill` 343 个（2026-11-08；前 100 中 4 个），包元数据 `dsh.catalog.category=skill` 在前 100 中为 0。下载数是市场自报的 `sortKeys`，DSH 不核验；dsh-plugin.org 首页称 22,137 个，口径与索引不同，未独立复核。技能包不是主流形态，但薄入口 + `references/` + `scripts/` 的形态与头部同一数量级。

| 前 100 的普遍做法 | 本包 |
| --- | --- |
| 薄入口 + `references/` | 三份 `SKILL.md` 85–94 行，条文在 `references/` |
| 双语 README | `README.md` 与 `README.en.md` 都有 |
| `locale/` | `locale/zh.json` 与 `locale/en.json` |
| `docs/` 不进包 | 有 `docs/`，只留仓库 |
| 质量门 | `npm test` 是唯一质量门 |
| 声明 `dsh.catalog.category` | 声明 `skill`；宿主不消费，只作元数据 |

对照的结论是入口体量与同类技能包在同一数量级（样本只有 4 个，不足以证明一致），双语、locale 与文档覆盖都不低于前排；本轮只补共用入口、references 索引与首行导航，不扩入口。
