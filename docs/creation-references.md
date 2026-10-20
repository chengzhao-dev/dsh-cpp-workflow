# 创建参考

本插件按 DSH 官方包形创建，技能内容以 Google C++ Style Guide 为基线，并对 `D:\Github\cpp-board-games` 的 C++ 教学技能做了逐文件审计。下面记录实际查过的来源、采用/拒绝的理由，以及无法验证的引用。

## DSH 官方文档

| 主题 | 来源 | 采用点 |
| --- | --- | --- |
| 技能发现与 provider | `https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills` | `SkillProvider` 的 `list()` / `get()` 形状；`ctx.skills.registerProvider`；项目级 rank 200、bundled rank 600；技能目录是 `<name>/SKILL.md`，不递归 |
| 包发布与 bundle | `https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish` | `dsh.bundle.patch`、`engines.dsh`、`files` 白名单、peer + dev 共享包、`lib/` 预编译 |
| 显示元数据 | 同上，locale `meta.title` / `meta.description` | `locale/zh.json`、`locale/en.json`；`icon.svg` 自包含且小于 256 KiB |

DSH 的技能发现按 rank 决定同名优先级，**数值越小优先级越高**：项目 `.agents/skills` 是 200，bundled 是 600。本插件取 **550**，所以项目技能可以覆盖同名候选，而插件优先于 bundled 的通用副本。`list()` 是完整发现结果，不用 observation 标记不完整。

## 参考插件

| 包/仓库 | 检查内容 | 采用/拒绝 |
| --- | --- | --- |
| `D:\Github\dsh-quarto-book` | `package.json`、`cordis.patch.yml`、`src/index.ts`、`skills/*/SKILL.md`、`docs/`、`scripts/checking-skill-links.mjs`、README | 采用包形、provider 门禁、`lib/` 提交、结构自检、中文优先 README；不采用 Quarto 专用逻辑 |
| `dsh-embedded-workbench@0.9.4` | npm 包内容：`package.json`、`cordis.patch.yml`、`lib/index.js`、`locale/{en,zh}.json`、8 个 `skills/<name>/SKILL.md` 与 references | 采用「一个 bundle + 多个技能 + 每技能 references/examples」的形态；它的 C/C++ 内容是嵌入式/Keil 专用，不复制 |
| `dsh-code-navigator@0.1.0` | npm 元数据、文件清单 | 只作为生态观察；没有确认其编译数据库实现，不作为依赖 |
| `@dsh-lsp-packs/dsh-lsp-cpp` | npm registry 查询 | **404**，无法验证；不写进依赖或设计承诺 |

下载量快照 `https://www.dsh.so/data/npm-downloads.json`（2026-10-18 生成，窗口 2026-10-11..18）前三名是 dsh-market、DeepSeek-Balance-Whale-Widget、DSH-better-sidebar；前 100 没有 C++ 专用插件。因此本插件按通用 bundle 约定设计，而不是模仿某个不存在的 C++ 头部插件。

## Google C++ Style Guide

来源：`https://google.github.io/styleguide/cppguide.html`。核对过的关键条文：

- 目标标准是 C++20，不使用 C++23 特性。
- 异常：「We do not use C++ exceptions.」本插件按用户要求偏离，见下。
- 头文件：自包含；include 顺序为相关头、C 系统头、C++ 标准库、其他库、项目头；项目头按源根后代包含。
- 命名：类型/函数 PascalCase，变量/参数/数据成员 snake_case，类成员尾随 `_`，常量/枚举值 `k` 前缀，命名空间 snake_case；访问器可以用 snake_case。
- 声明顺序：类型/别名 →（仅 struct）数据 → 静态常量 → 工厂 → 构造/赋值/析构 → 其他函数 → 数据成员。
- 单参数构造函数 `explicit`；不用 C 风格 cast；优先 `unique_ptr`；不用 `using namespace`。
- 头文件保护用 `#define`，明确不用 `#pragma once`。
- 列宽 80；提供 `cpplint.py`。

偏差表在 `skills/developing-cpp/references/google-cpp-style.md`，理由在 `docs/cpp-workflow-validation.md`。书面偏离集中在八类：异常、`#pragma once`、100 列、`Get` 访问器、`.h/.cpp` 扩展、用 clang-format/tidy 代替 cpplint、项目头裸文件名、封闭状态枚举的底层类型。其余是编译器/工具链选择，不是风格偏离。

## std::format 与 CMake

- GCC 13 发布说明：`https://gcc.gnu.org/gcc-13/changes.html`。libstdc++ 增加 `<format>` 与 `std::format`，所以 GCC 模式要求 `g++ >= 13`。
- libc++ C++20 状态：`https://libcxx.llvm.org/Status/Cxx20.html`。P0645R10 在 LLVM 14 完成；功能测试宏到 LLVM 19 才设置；P2216R3 在 LLVM 15；chrono 格式化到 LLVM 21。因此不能只看宏，检查器实际编译运行探针。
- `std::print` 是 C++23，C++20 不可用；统一用 `std::cout` / `std::cerr` 配合 `std::format`。
- CMake `CXX_STANDARD`：`https://cmake.org/cmake/help/latest/prop_tgt/CXX_STANDARD.html`。`20` 自 3.12 起支持；模板要求 3.20，并使用 `target_compile_features(... cxx_std_20)` 加 `CXX_EXTENSIONS OFF`，不设全局 `CMAKE_CXX_STANDARD`。
- `CMAKE_EXPORT_COMPILE_COMMANDS` 只对 Makefile/Ninja 生效；本项目固定 Ninja。
- clangd 系统头：`https://clangd.llvm.org/guides/system-headers`。`--query-driver` 是 clangd 命令行参数，不是 `.clangd` 键；本插件把它放在 `.vscode/settings.json` 的 `clangd.arguments`，`.clangd` 只写 `CompilationDatabase`。

## cpp-board-games 审计来源

逐文件读过：

- `.agents/skills/cpp-teaching/developing-cpp/SKILL.md`
- 同目录 `references/{cpp-spine,build-and-run,google-cpp-style}.md`、`references/stages/tictactoe.md`
- `assets/config/{.clang-format,.clang-tidy,.clangd,.vscode/*}`
- `assets/cmake/{applying-warnings,fetching-googletest,setting-rpath}.cmake`
- `assets/templates/projects/{common,single,multi,static-library,shared-library}/**`
- `.agents/context/conventions/cpp-teaching/cpp/**`、`naming/cpp-identifiers.md`、`build/**`
- `.agents/knowledge/cpp-teaching/cases/**`、`.agents/context/glossary/cpp-terms.md`

采用它的 Google 命名/声明/注释/异常分层，改写掉 WSL+Clang+libc++ 的硬编码、全局 CMake 设置、游戏/知识库耦合和 `run.ps1` 编排。没有修改该仓库。

## 设计选择与理由

- **两个技能、一个 bundle**：`developing-cpp`（1–4 步）和 `building-cpp`（5–7 步）共用七步顺序，但加载边界清楚。源码任务不会把 CMake 规则带进来，构建任务也不会改源码语义。
- **rank 550 + 项目技能门禁**：通用技能不应出现在每个 C++ 仓库；只有存在 `.agents/skills/cpp-workflow-project/SKILL.md` 的 git checkout 才返回候选。项目技能放工程事实，通用规则留插件，避免复制分叉。
- **不注册工具**：v1 只提供技能。构建和检查通过项目入口命令完成，插件不在宿主会话里启动编译器或写项目文件。
- **环境三轴**：`host` / `build_host` / `compiler` 是三个独立事实，不能压成一个「WSL + Clang」默认值。检查器只读，不安装、不修改 PATH。
- **`build/<compiler>`**：两套数据库不互相覆盖；根 `build/compile_commands.json` 软链接给默认读取 `build/` 的编辑器用。
- **静态检查第 5 步、live 第 7 步**：先挡住非法声明，再在真实 build host 上检查工具和 `std::format`。
- **`std::format` 探针**：版本号会骗人（尤其是 clang 使用系统 libstdc++），必须实际编译运行。
- **配置资产只在缺失时复制**：不覆盖已有的 `CMakeLists.txt`、`.clang-*`、`.vscode` 或源码；编译器轴变化时先问用户，不擅自改 `--query-driver`。
- **文档与自检随包发布**：`scripts/checking-skill-links.mjs` 检查文件、步骤编号、frontmatter、禁用词汇、相对链接、shell 语法、模板空轴和包元数据；`docs/` 记录来源与验证，方便后续维护者复核。

## 未能验证的引用

- `@dsh-lsp-packs/dsh-lsp-cpp`：npm 404。计划里把它作为 LSP 参考，但无法确认包是否存在、是否提供编译数据库。本插件不依赖它。
- `dsh-code-navigator` 的具体编译数据库搜索路径：只确认包存在，没有读源码，未作为依据。
- DSH Top 1000 下载量：没有拿到完整榜单，只有 dsh.so 前 100 快照。架构结论只基于该快照和两个实际包。
- macOS Apple Clang 实机行为：规则来自 `clang --version` 的 Apple 分支和官方文档，未在 macOS 实机跑 `--live`。
