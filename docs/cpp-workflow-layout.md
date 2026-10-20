# 插件结构

`dsh-cpp-workflow` 是一个 DSH bundle，只做两件事：注册两个技能，提供一套可复制的项目模板与资产。它不注册工具，不在 `apply()` 里扫描项目、探测工具链或写文件。

## 包结构

```text
dsh-cpp-workflow/
├── src/index.ts                  # provider 与工作区门禁
├── lib/index.js                  # tsc 产物，随包发布
├── cordis.patch.yml              # 只 insert 一行 cpp-workflow
├── locale/{zh,en}.json           # 插件显示名与描述
├── icon.svg                      # 自包含，≤256 KiB
├── skills/
│   ├── developing-cpp/           # 第 1–4 步
│   │   ├── SKILL.md
│   │   ├── steps/01-behavior.md … 04-implementation.md
│   │   ├── references/           # 风格、命名、异常、声明顺序、注释、布局、术语
│   │   └── examples/             # 结构、命名、注释、异常的正反例
│   └── building-cpp/             # 第 5–7 步
│       ├── SKILL.md
│       ├── steps/05-build.md … 07-check.md
│       ├── references/           # 环境、CMake、静态检查、构建脚本
│       ├── examples/             # 环境、CMake、工具配置
│       ├── assets/
│       │   ├── config/           # .clang-format/.clang-tidy/.clangd/.vscode
│       │   ├── cmake/            # 警告、GoogleTest、RPATH 模块
│       │   └── templates/projects/
│       │       ├── common/running-build.sh
│       │       ├── single/
│       │       ├── multi/
│       │       ├── static-library/
│       │       └── shared-library/
│       └── scripts/checking-environment.mjs
├── templates/cpp-workflow-project/   # 复制到目标仓库的项目技能
├── docs/                         # 创建参考、结构、校验记录
├── scripts/checking-skill-links.mjs
└── tests/                        # provider + checker
```

## 技能发现

`src/index.ts` 只导出 `name`、`inject` 和 `apply()`：

- `inject = ['skills']`，`apply(ctx)` 只调用 `ctx.skills.registerProvider(...)`。
- provider 名 `dsh-cpp-workflow`，rank **550**。rank 数值越小优先级越高：项目 `.agents/skills` 的 200 在同名时胜出，bundled 的 600 低于本插件。
- `list({ cwd })` 先找 `cwd` 到 git 根的最近 git 根，再在 `cwd` 到 git 根之间找 `.agents/skills/cpp-workflow-project/SKILL.md`。找不到就返回空数组；git 根之上的标记不算。
- 只返回 `developing-cpp`、`building-cpp` 两个候选；`skills/` 下其他目录不会被发现。
- `get(candidate)` 只服务本 provider 的 candidate，`locator` 必须解析到本包 `skills/` 之内，然后重新读 `SKILL.md` 正文。

技能目录是**一层**：`skills/<name>/SKILL.md`，官方发现不递归。`steps/`、`references/`、`examples/`、`assets/` 都由 `resourceBase` 指向技能目录，由正文里的相对路径按需读取。

## 两个技能的分工

| 技能 | 步骤 | 负责 | 不负责 |
| --- | --- | --- | --- |
| `developing-cpp` | 1 定行为、2 定边界、3 定声明、4 定实现 | `.h` / `.cpp`、命名、异常、源码注释、库与程序边界 | CMake、`.clang-*`、构建脚本、文档、Python |
| `building-cpp` | 5 定构建、6 定工具配置、7 通过检查 | CMake target、Ninja、编译数据库、clang-format/tidy/clangd、环境校验 | 源码语义、命名、异常正文 |

路由表在每个 `SKILL.md` 顶部。同一次改动跨过边界时，先完成 `developing-cpp` 的第 2 步，再开 `building-cpp`；不要在一个技能里写另一个技能的文件。编译失败按诊断位置分诊：函数体/类型回第 4 步，头文件/链接/数据库/工具 PATH 回第 5、6 步。

## 步骤文件

- 每步一个文件，H1 固定 `# 第 N 步 …`；`scripts/checking-skill-links.mjs` 会核对编号和 H1。
- 每步文件按「产出 / 通用情况 / 情况 / 正反例指针」组织；正反例放 `examples/`，完整条文放 `references/`，步骤文件只做路由和验收。
- 不把知识库 id、`.agents/` 路径、项目专属类名写进通用技能。项目事实只放项目技能。

## 项目模板

`templates/cpp-workflow-project/` 复制到目标仓库的 `.agents/skills/cpp-workflow-project/`：

```text
.agents/skills/cpp-workflow-project/
├── SKILL.md                  # 工程名、入口命令、库/程序边界、阶段表
├── environment.json          # host / build_host / compiler，三个空轴
└── stages/stage-table.md     # 可观察行为、验证方式、状态
```

模板本身不是可加载技能：三个轴故意留空，工程名和入口命令是占位符。复制后先填事实，再让 `developing-cpp` / `building-cpp` 读取。

## 资产如何进入项目

`building-cpp/assets/` 是脚手架来源，不是运行时代码：

1. 先读项目 `environment.json`，确认三轴合法。
2. 只复制**缺失**的文件：`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/`、`cmake/` 模块、`running-build.sh`。
3. 不覆盖已有 `CMakeLists.txt`、`.clang-*`、`.vscode` 或源码；已有配置先读再决定是否合并。
4. 项目需要 CMake 助手时，把 `assets/cmake/*.cmake` 复制到项目 `cmake/`，在顶层加 `CMAKE_MODULE_PATH` 后 `include()`；不要从插件目录直接 `include`。
5. 项目入口命令写进项目 `SKILL.md`；模板默认 `./running-build.sh clang` 或 `./running-build.sh gcc`，实际以项目为准。
6. 四个 CMake 模板都带 `enable_testing()` 和 `app_smoke`，首次 `ctest` 不会出现「No tests were found」却仍算通过；真实行为测试再按公开头文件补。

`running-build.sh` 是 POSIX build host 脚本，适用于 Linux、macOS 和 Windows + WSL。Windows 原生（`host=windows` + `build_host=native`）是合法声明，但本版本没有 PowerShell 版本；`--live` 会明确报告缺的是 shell，不是编译器。项目尚未放 `.clang-format` 时，脚本用 `--fallback-style=Google`，避免落到 clang-format 的 LLVM 默认风格。

## 构建目录与工具

```text
build/
├── clang/
│   ├── compile_commands.json
│   ├── bin/app
│   └── lib/
├── gcc/
│   └── …
└── compile_commands.json -> clang/compile_commands.json   # 当前编译器
```

- 生成器固定 Ninja；一个 configure 只用一个编译器。
- `.clangd` 的 `CompilationDatabase: build/clang` 指向当前目录；换 GCC 时改成 `build/gcc`，并同步 `.vscode/settings.json` 的 `--query-driver` 绝对路径。
- `clang-format` 收全部项目 `.cpp/.h/.hpp`；`clang-tidy` 只收 `.cpp`，用 `-p build/<compiler>` 和 `--header-filter`。
- 脚本先查 CRLF，再格式检查、静态检查、CTest、运行；任何一步失败就停，不继续下一步。

## 自检

```bash
npm run build      # tsc → lib/
npm test           # provider + checker，不依赖本机 C++ 工具链
npm run check      # tsc --noEmit + 结构/链接/shell/模板/包元数据检查
npm run pack:check # npm pack --dry-run
```

结构检查覆盖：技能文件是否存在、步骤编号与 H1、frontmatter 名称与 C++20、禁止词汇（知识库 id、`.agents/`、项目专属类名）、反引号相对路径、`bash -n`、项目模板三轴为空、`package.json` / patch / locale / icon。它不编译 C++ 模板；模板编译属于目标 build host 的验收。
