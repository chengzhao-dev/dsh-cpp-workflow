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

三份 `SKILL.md` 分别为 `developing-cpp` 94 行、`engineering` 87 行、`building-cpp` 85 行，合计约 1.46 万字符（全部加载约 8.1k tokens；只有目录行常驻）；最大的 reference 是 `skills/developing-cpp/references/exceptions/throw-rules.md` 216 行，其余按主题拆成单文件、由正文点名后按需读取。Agent Skills 规范建议正文控制在 500 行以内、references 保持聚焦；本次抽查的 4 个带技能包，其 `SKILL.md` 分别 13–14、23、60 与 138 行，本包把细节放在 references 里，正文只留入口、步骤与完成判据。

目录消息只带 `name` 与 `description`，DSH 默认在 500 字符处截断；三份 description 分别为 `building-cpp` 197、`developing-cpp` 143、`engineering` 198 字符，触发条件与常见症状写在句子里，未依赖 `whenToUse` 字段兜底（该字段仍会随候选一起返回）。插件 rank 是 550：近层同名先直接胜出，rank 只在同一层内决胜；本项目与用户目录的 200、500 两档都排在它前面，本包不注册根技能。

## 与下载量前 50 的对照

`dsh.so` 的 2026-11-04 七日榜前 50 名里，包形态以工具、皮肤、连接器为主：只有 4 个带技能（`modlens` 1 个、`dsh-image-gen` 1 个、`dsh-univer-office` 12 个、`modsearch` 1 个），其余 46 个没有 `skills/` 目录。这 4 个都把 `SKILL.md` 当薄入口：`dsh-univer-office` 每份 13–14 行，`modlens` 60 行，`modsearch` 138 行；条文放 `references/`，可执行片段放 `scripts/`。本包三份 85–94 行的入口加同一套分层，与它们同构。

同一时点（2026-11-06）的前 100 名里，带技能的 11 个（前 50 4 个、后 50 7 个）：`dsh-univer-office` 12 个、`dsh-windows2macos` 4 个，其余各 1 个。`dsh.catalog.category=skill` 仍为 0；技能包不是主流形态，本包的三技能入口、双语 README 与 docs 密度属于少数派，覆盖不低于前排中位数。

| 前 50 名里的做法 | 本包 |
| --- | --- |
| 多种语言 README 36 个，其中带英文 README 20 个 | `README.md` 与 `README.en.md` 都有 |
| `locale/` 22 个 | `locale/zh.json` 与 `locale/en.json` |
| `docs/` 17 个 | 有 `docs/`，只留仓库、不进包 |
| `CHANGELOG` 18 个 | 不维护，变更记录即 GitHub Release，见 [versioning.md](versioning.md) |
| `scripts.test` 有实质内容 32 个 | `npm test` 是唯一质量门 |
| 声明 `dsh.catalog.category` 的 0 个 | 本包声明 `skill`；该字段不被宿主消费，只作元数据 |

对照的结论是入口体量与同类技能包一致，双语、locale 与文档覆盖都不低于前排，`description` 平均 149 个字符（英文），本包为 143–198 个字符，信息量相当；因此三处都保持现状，只把这份核对结果记在这里。
