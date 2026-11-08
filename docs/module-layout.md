# 模块布局

`docs/architecture.md` 解释分层与加载顺序，本页只回答「文件在哪」。新增、改名或移动文件时，先改本页的树，再改 `scripts/checking-skill-links.mjs` 的覆盖检查，最后跑 `npm test`；结构检查按文件名核对技能目录内是否有对应条目，目录层级与放置位置以本页为准。

## 命名规则

- 目录名不加数字前缀；数字只出现在步骤文件与同一主题内的条文文件上。
- 步骤文件用两位数字前缀，表示先后顺序：`steps/01-behavior.md`。
- 一个主题内部的条文按两位数字前缀排阅读顺序；目录里只有一个主文档时不加数字。案例文件按种类命名，不加数字（如 `declaration-enum.md`、`throw-when.md`）。
- 只有还会继续长大的主题才建子目录（如 `references/language/language-basics/`）；`examples/` 与 `glossary/` 内不再建目录。
- 入口表可以点名目录（如 `references/language/`）；结构检查从入口表出发，沿路径、目录与本地链接确认 `references/` 下每份 Markdown 可达。新增文件放进已点名的目录，或同时补入口表。
- 同一事实只在一份文件展开，旧路径不保留转述页。

## 顶层、docs 与脚本

```text
dsh-cpp-workflow/
├── .github/
├── docs/
│   ├── architecture.md
│   ├── comment-sources.md
│   ├── module-layout.md
│   ├── plugin-boundaries.md
│   ├── plugin-flow.md
│   ├── plugin-layout.md
│   ├── plugin-storage.md
│   ├── triggering.md
│   └── versioning.md
├── locale/
├── scripts/
│   ├── building-client.mjs
│   ├── checking-github-workflows.mjs
│   ├── checking-skill-links.mjs
│   ├── checking-standard-matrix.sh
│   └── skill-link-rules.mjs
├── skills/
├── src/
├── templates/
│   └── cpp-workflow-project/
│       ├── stages/
│       │   └── stage-table.md
│       ├── environment.json
│       └── SKILL.md
├── tests/
│   ├── client.test.mjs
│   ├── comment-policy.test.mjs
│   ├── comments.test.mjs
│   ├── declaration-order.test.mjs
│   ├── discovery.test.mjs
│   ├── encoding.test.mjs
│   ├── environment.test.mjs
│   ├── provider.test.mjs
│   ├── schema.test.mjs
│   ├── skill-link-rules.test.mjs
│   └── storage.test.mjs
├── .editorconfig
├── .gitattributes
├── .gitignore
├── cordis.patch.yml
├── icon.svg
├── LICENSE
├── package-lock.json
├── package.json
├── README.en.md
├── README.md
└── tsconfig.json
```

生成物 `lib/`、缓存 `temp/` 与依赖 `node_modules/` 不逐项列出，用途见下面两节。

## src/ 与 lib/

```text
src/
├── client/
│   ├── app.cjs.js
│   ├── form-state.js
│   ├── shell.js
│   ├── styles.js
│   ├── text.js
│   └── widgets.js
├── comment-policy.ts
├── index.ts
└── workspace.ts
```

`src/comment-policy.ts` 由服务端与客户端共用：`scripts/building-client.mjs` 把它内联进 `lib/client.js`，两边读同一份默认值与快照。`lib/` 是 `npm run build` 的产物（`index.js`、`workspace.js`、`comment-policy.js`、`client.js`），改源码后重新构建，不手改。

## skills/developing-cpp

```text
developing-cpp/
├── references/
│   ├── comments/
│   │   ├── examples/
│   │   │   ├── declaration-class.md
│   │   │   ├── declaration-constructor.md
│   │   │   ├── declaration-enum.md
│   │   │   ├── declaration-file.md
│   │   │   ├── declaration-function.md
│   │   │   ├── declaration-member.md
│   │   │   ├── declaration-predicate.md
│   │   │   ├── declaration-struct.md
│   │   │   ├── implementation-body.md
│   │   │   └── implementation-todo.md
│   │   ├── glossary/
│   │   │   └── comment-terms.md
│   │   ├── comment-rules.md
│   │   └── comment-style.md
│   ├── design/
│   │   ├── examples/
│   │   │   ├── behavior-sentence.md
│   │   │   ├── coordinate-table.md
│   │   │   ├── header-place.md
│   │   │   ├── library-boundary.md
│   │   │   ├── library-split.md
│   │   │   ├── move-result.md
│   │   │   └── preview-read.md
│   │   └── project-design.md
│   ├── editing/
│   │   ├── 01-edit-operations.md
│   │   └── 02-rule-priority.md
│   ├── exceptions/
│   │   ├── examples/
│   │   │   ├── throw-boundary.md
│   │   │   ├── throw-build-mode.md
│   │   │   ├── throw-catch.md
│   │   │   ├── throw-destructor.md
│   │   │   ├── throw-format.md
│   │   │   ├── throw-message.md
│   │   │   └── throw-when.md
│   │   └── throw-rules.md
│   ├── language/
│   │   ├── glossary/
│   │   │   └── language-terms.md
│   │   ├── language-basics/
│   │   │   ├── 01-objects.md
│   │   │   ├── 02-initialization.md
│   │   │   ├── 03-deduction.md
│   │   │   ├── 04-const.md
│   │   │   ├── 05-expressions.md
│   │   │   ├── 06-functions.md
│   │   │   ├── 07-classes.md
│   │   │   ├── 08-raii.md
│   │   │   ├── 09-templates.md
│   │   │   └── 10-checklist.md
│   │   ├── performance/
│   │   │   ├── 01-measure.md
│   │   │   ├── 02-complexity.md
│   │   │   ├── 03-memory.md
│   │   │   ├── 04-undefined-behavior.md
│   │   │   ├── 05-pitfalls.md
│   │   │   ├── 06-false-optimizations.md
│   │   │   └── 07-checklist.md
│   │   ├── standard-library/
│   │   │   ├── 01-containers.md
│   │   │   ├── 02-access.md
│   │   │   ├── 03-iteration.md
│   │   │   ├── 04-algorithms.md
│   │   │   ├── 05-string.md
│   │   │   ├── 06-format.md
│   │   │   ├── 07-time.md
│   │   │   ├── 08-random.md
│   │   │   ├── 09-files.md
│   │   │   └── 10-checklist.md
│   │   └── value-types/
│   │       ├── 01-width.md
│   │       ├── 02-signed.md
│   │       ├── 03-integer-roles.md
│   │       ├── 04-enum.md
│   │       ├── 05-strong-type.md
│   │       ├── 06-const-method.md
│   │       ├── 07-nodiscard.md
│   │       ├── 08-comparison.md
│   │       ├── 09-subscript.md
│   │       ├── 10-float-bool.md
│   │       └── 11-checklist.md
│   ├── layout/
│   │   ├── 01-source-layout.md
│   │   ├── 02-file-template.md
│   │   └── 03-declaration-order.md
│   ├── naming/
│   │   ├── examples/
│   │   │   ├── naming-accessor.md
│   │   │   ├── naming-basic.md
│   │   │   ├── naming-current-prefix.md
│   │   │   ├── naming-local.md
│   │   │   ├── naming-lookup.md
│   │   │   ├── naming-lower-layer.md
│   │   │   ├── naming-multiple-return.md
│   │   │   ├── naming-player-value.md
│   │   │   ├── naming-predicate.md
│   │   │   ├── naming-rename.md
│   │   │   ├── naming-responsibility.md
│   │   │   ├── naming-role.md
│   │   │   └── naming-state-change.md
│   │   ├── glossary/
│   │   │   ├── naming-terms.md
│   │   │   ├── position.md
│   │   │   └── square.md
│   │   └── identifier-names.md
│   └── style/
│       └── google-cpp-style.md
├── scripts/
│   ├── checking-comments.mjs
│   └── checking-declaration-order.mjs
├── steps/
│   ├── 01-behavior.md
│   ├── 02-boundary.md
│   ├── 03-declaration.md
│   └── 04-implementation.md
└── SKILL.md
```

## skills/engineering

```text
engineering/
├── references/
│   ├── cmake/
│   │   ├── assets/
│   │   │   ├── CompileSettings.cmake
│   │   │   └── LinkSettings.cmake
│   │   ├── linking/
│   │   │   ├── 01-libraries.md
│   │   │   ├── 02-rpath.md
│   │   │   ├── 03-undefined-reference.md
│   │   │   └── 04-inspect.md
│   │   ├── modules/
│   │   │   └── functions.md
│   │   ├── standards/
│   │   │   ├── examples/
│   │   │   │   └── standard.md
│   │   │   ├── c++11/
│   │   │   │   ├── cmake-snippet.cmake
│   │   │   │   └── README.md
│   │   │   ├── c++14/
│   │   │   │   ├── cmake-snippet.cmake
│   │   │   │   └── README.md
│   │   │   ├── c++17/
│   │   │   │   ├── cmake-snippet.cmake
│   │   │   │   └── README.md
│   │   │   ├── c++20/
│   │   │   │   ├── cmake-snippet.cmake
│   │   │   │   └── README.md
│   │   │   ├── c++23/
│   │   │   │   ├── cmake-snippet.cmake
│   │   │   │   └── README.md
│   │   │   ├── README.md
│   │   │   └── cxx-standard.md
│   │   ├── targets/
│   │   │   ├── examples/
│   │   │   │   ├── glob.md
│   │   │   │   ├── rpath.md
│   │   │   │   └── target.md
│   │   │   └── rules.md
│   │   └── testing/
│   │       └── ctest.md
│   └── formatting/
│       ├── examples/
│       │   ├── clang-format.md
│       │   ├── clang-tidy.md
│       │   └── clangd.md
│       ├── scripts/
│       │   └── checking-encoding.mjs
│       ├── 01-encoding.md
│       ├── 02-clang-format.md
│       ├── 03-clang-tidy.md
│       └── 04-clangd.md
├── steps/
│   ├── 01-targets.md
│   ├── 02-modules.md
│   └── 03-check.md
└── SKILL.md
```

## skills/building-cpp

```text
building-cpp/
├── assets/
│   ├── config/
│   │   ├── .vscode/
│   │   │   ├── extensions.json
│   │   │   └── settings.json
│   │   ├── .clang-format
│   │   ├── .clang-tidy
│   │   └── .clangd
│   └── templates/
│       └── projects/
│           ├── common/
│           │   └── running-build.sh
│           ├── multi/
│           │   ├── include/
│           │   │   └── greeting.h
│           │   ├── src/
│           │   │   ├── greeting.cpp
│           │   │   └── main.cpp
│           │   └── CMakeLists.txt
│           ├── shared-library/
│           │   ├── greeting/
│           │   │   ├── include/
│           │   │   │   └── greeting.h
│           │   │   ├── src/
│           │   │   │   └── greeting.cpp
│           │   │   └── CMakeLists.txt
│           │   ├── src/
│           │   │   └── main.cpp
│           │   └── CMakeLists.txt
│           ├── single/
│           │   ├── src/
│           │   │   └── main.cpp
│           │   └── CMakeLists.txt
│           └── static-library/
│               ├── greeting/
│               │   ├── include/
│               │   │   └── greeting.h
│               │   ├── src/
│               │   │   └── greeting.cpp
│               │   └── CMakeLists.txt
│               ├── src/
│               │   └── main.cpp
│               └── CMakeLists.txt
├── examples/
│   └── environment.md
├── project/
│   └── vscode/
│       ├── 01-extensions.md
│       └── 02-settings.md
├── references/
│   ├── build-script.md
│   └── environment.md
├── scripts/
│   └── checking-environment.mjs
├── steps/
│   ├── 01-build.md
│   ├── 02-tooling.md
│   └── 03-check.md
└── SKILL.md
```
