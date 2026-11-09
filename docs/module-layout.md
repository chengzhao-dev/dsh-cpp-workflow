# 模块布局

`docs/architecture.md` 解释分层与加载顺序，本页只回答「文件在哪」。新增、改名或移动文件时，先改本页的树，再改 `scripts/checking-skill-links.mjs` 的覆盖检查，最后跑 `npm test`；结构检查按文件名核对技能目录内是否有对应条目，目录层级与放置位置以本页为准。

## 命名规则

- 目录名不加数字前缀；数字只出现在步骤文件与同一主题内的条文文件上。
- 步骤文件用两位数字前缀，表示先后顺序：`steps/01-behavior.md`。
- 一个主题内部的条文按两位数字前缀排阅读顺序；目录里只有一个主文档时不加数字。案例文件按种类命名，不加数字（如 `03-declaration-enum.md`、`07-throw-when.md`）。
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
│   ├── design-principles.md
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

## skills/shared

```text
shared/
├── budget.md
├── operations.md
└── rule-priority.md
```

## skills/developing-cpp

```text
developing-cpp/
├── references/
│   ├── index.md
│   ├── comments/
│   │   ├── examples/
│   │   │   ├── 01-declaration-class.md
│   │   │   ├── 02-declaration-constructor.md
│   │   │   ├── 03-declaration-enum.md
│   │   │   ├── 04-declaration-file.md
│   │   │   ├── 05-declaration-function.md
│   │   │   ├── 06-declaration-member.md
│   │   │   ├── 07-declaration-predicate.md
│   │   │   ├── 08-declaration-struct.md
│   │   │   ├── 09-implementation-body.md
│   │   │   └── 10-implementation-todo.md
│   │   ├── glossary/
│   │   │   └── 01-comment-terms.md
│   │   ├── 01-comment-rules.md
│   │   └── 02-style.md
│   ├── design/
│   │   ├── examples/
│   │   │   ├── 01-behavior-sentence.md
│   │   │   ├── 02-coordinate-table.md
│   │   │   ├── 03-header-place.md
│   │   │   ├── 04-library-boundary.md
│   │   │   ├── 05-library-split.md
│   │   │   ├── 06-move-result.md
│   │   │   └── 07-preview-read.md
│   │   ├── 01-project-design.md
│   │   └── session-layer.md
│   ├── exceptions/
│   │   ├── examples/
│   │   │   ├── 01-throw-boundary.md
│   │   │   ├── 02-throw-build-mode.md
│   │   │   ├── 03-throw-catch.md
│   │   │   ├── 04-throw-destructor.md
│   │   │   ├── 05-throw-format.md
│   │   │   ├── 06-throw-message.md
│   │   │   └── 07-throw-when.md
│   │   └── 01-exception-rules.md
│   ├── language/
│   │   ├── glossary/
│   │   │   └── 01-language-terms.md
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
│   │   │   └── 10-language-checklist.md
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
│   │   │   └── 10-library-checklist.md
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
│   │   │   ├── 01-naming-accessor.md
│   │   │   ├── 02-naming-basic.md
│   │   │   ├── 03-naming-current-prefix.md
│   │   │   ├── 04-naming-local.md
│   │   │   ├── 05-naming-lookup.md
│   │   │   ├── 06-naming-lower-layer.md
│   │   │   ├── 07-naming-multiple-return.md
│   │   │   ├── 08-naming-player-value.md
│   │   │   ├── 09-naming-predicate.md
│   │   │   ├── 10-naming-rename.md
│   │   │   ├── 11-naming-responsibility.md
│   │   │   ├── 12-naming-role.md
│   │   │   └── 13-naming-state-change.md
│   │   ├── glossary/
│   │   │   ├── 01-naming-terms.md
│   │   │   ├── 02-position.md
│   │   │   ├── 03-selection.md
│   │   │   ├── 04-square.md
│   │   │   ├── 05-scoring.md
│   │   │   └── 06-difficulty.md
│   │   └── 01-identifier-names.md
│   └── style/
│       └── 01-google-cpp-style.md
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
│   ├── index.md
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
│   │   │   └── 01-functions.md
│   │   ├── standards/
│   │   │   ├── examples/
│   │   │   │   └── 01-standard.md
│   │   │   ├── c++11/
│   │   │   │   └── cmake-snippet.cmake
│   │   │   ├── c++14/
│   │   │   │   └── cmake-snippet.cmake
│   │   │   ├── c++17/
│   │   │   │   └── cmake-snippet.cmake
│   │   │   ├── c++20/
│   │   │   │   └── cmake-snippet.cmake
│   │   │   ├── c++23/
│   │   │   │   └── cmake-snippet.cmake
│   │   │   ├── versions.md
│   │   │   ├── index.md
│   │   │   └── 01-cxx-standard.md
│   │   ├── targets/
│   │   │   ├── examples/
│   │   │   │   └── 01-rpath.md
│   │   │   └── 01-target-rules.md
│   │   └── testing/
│   │       └── 01-ctest.md
│   └── formatting/
│       ├── examples/
│       │   ├── 01-clang-format.md
│       │   ├── 02-clang-tidy.md
│       │   └── 03-clangd.md
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
├── references/
│   ├── 01-build-script.md
│   └── 02-environment.md
├── scripts/
│   └── checking-environment.mjs
├── steps/
│   ├── 01-build.md
│   ├── 02-tooling.md
│   ├── 03-check.md
│   └── 04-vscode.md
└── SKILL.md
```
