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
├── scripts/{building-client.mjs,checking-skill-links.mjs,checking-standard-matrix.sh}
├── src/
│   ├── client/                    # 浏览器半侧，按职责分片，构建时拼接
│   │   ├── shell.js               # React、h 与包名
│   │   ├── text.js                # 中英文案与语言选择
│   │   ├── styles.js              # 样式表与注入
│   │   ├── widgets.js             # 开关、输入行、预览等无状态组件
│   │   ├── form-state.js          # 快照读取、差异计算、表单解析
│   │   └── app.cjs.js             # 配置卡片与 plugins.bundle.config 挂点
│   ├── comment-policy.ts          # 标签策略，服务端与客户端共用
│   ├── index.ts
│   └── workspace.ts
├── skills/
│   ├── developing-cpp/{SKILL.md,steps,examples,references,scripts}
│   ├── configuring-cmake/{SKILL.md,steps,examples,references,assets}
│   └── building-cpp/{SKILL.md,steps,examples,references,assets,scripts}
├── templates/cpp-workflow-project/{SKILL.md,environment.json,stages/stage-table.md}
├── tests/{provider,environment,schema,encoding,comments,comment-policy}.test.mjs
└── lib/                         # 构建输出，随 npm 包发布
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

`main` 指向 `lib/index.js`。入口导出 `name`、`inject: ['skills']`、`Config` 与 `apply(ctx, config)`：`apply()` 注册技能 provider，并在每次 `get()` 时从宿主原地更新的 config 对象重新归一化，文件头标签配置附在技能正文末尾；`Config` 用 Schemastery 声明文件头标签开关，字段都是 `volatile()`，设置页保存后即时生效。浏览器半侧在 `exports["./client"]`（`lib/client.js`），模块导出 `inject: ['slots', 'configForms']`；`package.json` 的 `dsh.client` 声明平台 `web`，并依赖宿主的 slots、settings 与 plugin-manager 包。

配置页优先使用 `plugins.bundle.config` owner 通过 props 传进来的 `form`（宿主文档路径）；owner 没传时，回退到 `ctx.configForms.get('cpp-workflow')`（profile 条目 id，不是 npm 包名）。回退查询放在渲染期而不是 `apply` 期，并在首次绘制后按 500 ms 重试 20 次，避免服务晚到或旧 bundle 把 `undefined` 永久冻进页面。两次都拿不到时才显示恢复提示（重启应用、重新载入页面），不再把内置默认值伪装成“当前配置”。挂点仍在 `configForms.whileServed(['cpp-workflow'], ...)` 内注册唯一的 `plugins.bundle.config` 贡献；`view: 'summary'` 返回 `null`，不给列表摘要添行。

`cordis.patch.yml` 只有一条 `insert`，`id` 是 `cpp-workflow`，`name` 与 npm 包名逐字相同；浏览器半侧仍挂在同一行，补丁不拆行。

技能从 `skills/<name>/SKILL.md` 一层发现，不递归。每个技能目录是 `resourceBase`，`steps/`、`examples/`、`references/`、`assets/` 的相对链接从该目录解析。`templates/` 不注册为技能，只作为复制源。CMake 契约与可复用函数在 `skills/configuring-cmake/`，构建、工具链与工程模板在 `skills/building-cpp/`。

`skills/building-cpp/references/standards/` 下按 `c++11` 到 `c++23` 每档一个目录，目录内是 `README.md`（设施、工具、降档、验证）和 `cmake-snippet.cmake`（该 target 的最小 CMake 片段）；索引是 `standards/README.md`。公共模板仍只有四套，不按标准复制。

`skills/building-cpp/references/encoding.md` 记编码与行尾；`skills/building-cpp/scripts/checking-encoding.mjs` 按 `portable` 或 `msvc` 档检查 BOM、行尾与末尾换行。根 `.editorconfig` 与 `.gitattributes` 是机器规则，`.clang-format` 的 `LineEnding` 跟它们同档。

## 版本与元数据

发布版本以 `package.json` 为唯一来源；`package-lock.json` 的两个版本字段跟随它，不单独改。`dsh.catalog` 声明分类和摘要，`publishConfig` 声明 public 与 provenance。`engines`、peer 和 dev 的 `@deepseek-ai/dsh-skill` 使用同一范围。

## 本地产物

`npm run build` 先 `tsc` 把服务端 `src/*.ts` 编译到 `lib/`，再跑 `scripts/building-client.mjs`：它把 `lib/comment-policy.js` 里的声明内联成一份作用域副本（按顶层 `export` 切分并去掉导出关键字，函数体不改），按 `shell → text → styles → widgets → form-state → app` 的顺序拼上 `src/client/*.js`，外面套 `window.__ModuleLoader__.load({ id, factory })` 封装，写出 `lib/client.js`。分片共享同一工厂作用域，不在分片里各自 `require`；`--check` 在 CI 里验证产物与源一致。两处输出都在发布前重新生成，不手工编辑。`npm pack --dry-run` 用来核对白名单，不把源码、测试或文档带进 tarball。
