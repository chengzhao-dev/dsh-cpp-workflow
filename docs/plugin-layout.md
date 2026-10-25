# 包布局

```text
dsh-cpp-workflow/
├── .editorconfig
├── .gitattributes
├── .github/
│   ├── creation-references.md
│   └── workflows/
│       ├── ci.yml
│       └── publish.yml
├── cordis.patch.yml
├── docs/
│   ├── architecture.md
│   ├── plugin-boundaries.md
│   ├── plugin-flow.md
│   ├── plugin-layout.md
│   ├── triggering.md
│   └── versioning.md
├── icon.svg
├── locale/{en,zh}.json
├── LICENSE
├── README.md
├── README.en.md
├── package-lock.json            # 只在仓库，供 npm ci
├── package.json
├── scripts/{checking-skill-links.mjs,checking-standard-matrix.sh}
├── src/{index.ts,workspace.ts}
├── skills/
│   ├── developing-cpp/{SKILL.md,steps,examples,references,scripts}
│   ├── configuring-cmake/{SKILL.md,steps,examples,references,assets}
│   └── building-cpp/{SKILL.md,steps,examples,references,assets,scripts}
├── templates/cpp-workflow-project/{SKILL.md,environment.json,stages/stage-table.md}
├── tests/{provider,environment,schema,encoding,comments}.test.mjs
└── lib/                         # tsc 输出，随 npm 包发布
```

## 进 npm 包的文件

`package.json` 的 `files` 是白名单，只含：

- `lib`
- `skills`
- `cordis.patch.yml`
- `locale`
- `icon.svg`
- `README.md`
- `README.en.md`
- `LICENSE`
- `templates`

`src/`、`tests/`、`scripts/`、`docs/`、`.github/` 不进 npm 包。`package-lock.json` 留在仓库里，供 CI 用 `npm ci` 复现依赖。

## 入口与补丁

`main` 指向 `lib/index.js`。入口只导出 `name`、`inject: ['skills']` 和 `apply()`；`apply()` 只注册技能 provider。`cordis.patch.yml` 只有一条 `insert`，`id` 是 `cpp-workflow`，`name` 与 npm 包名逐字相同。没有 `dsh.client`，没有额外补丁行。

技能从 `skills/<name>/SKILL.md` 一层发现，不递归。每个技能目录是 `resourceBase`，`steps/`、`examples/`、`references/`、`assets/` 的相对链接从该目录解析。`templates/` 不注册为技能，只作为复制源。CMake 契约与可复用函数在 `skills/configuring-cmake/`，构建、工具链与工程模板在 `skills/building-cpp/`。

`skills/building-cpp/references/standards/` 下按 `c++11` 到 `c++23` 每档一个目录，目录内是 `README.md`（设施、工具、降档、验证）和 `cmake-snippet.cmake`（该 target 的最小 CMake 片段）；索引是 `standards/README.md`。公共模板仍只有四套，不按标准复制。

`skills/building-cpp/references/encoding.md` 记编码与行尾；`skills/building-cpp/scripts/checking-encoding.mjs` 按 `portable` 或 `msvc` 档检查 BOM、行尾与末尾换行。根 `.editorconfig` 与 `.gitattributes` 是机器规则，`.clang-format` 的 `LineEnding` 跟它们同档。

## 版本与元数据

发布版本以 `package.json` 为唯一来源；`package-lock.json` 的两个版本字段跟随它，不单独改。`dsh.catalog` 声明分类和摘要，`publishConfig` 声明 public 与 provenance。`engines`、peer 和 dev 的 `@deepseek-ai/dsh-skill` 使用同一范围。

## 本地产物

`npm run build` 把 `src/` 编译到 `lib/`。`lib/` 在发布前重新生成，不手工编辑。`npm pack --dry-run` 用来核对白名单，不把源码、测试或文档带进 tarball。
