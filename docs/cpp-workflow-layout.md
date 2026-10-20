# 插件结构

`dsh-cpp-workflow` 是一个 DSH bundle，只做两件事：注册四个技能，提供一套可复制的项目模板与资产。它不注册工具，不在 `apply()` 里扫描项目、探测工具链或写文件。

## 包结构

```text
dsh-cpp-workflow/
├── src/index.ts                  # provider 与工作区门禁
├── src/workspace.ts              # git 根、项目标记与 C++ 工程证据发现
├── lib/index.js                  # tsc 产物，随包发布
├── cordis.patch.yml              # 只 insert 一行 cpp-workflow
├── locale/{zh,en}.json           # 插件显示名与描述
├── icon.svg                      # 自包含，≤256 KiB
├── skills/
│   ├── developing-cpp/           # 第 1–4 步
│   │   ├── SKILL.md
│   │   ├── steps/01-behavior.md … 04-implementation.md
│   │   ├── references/           # 风格、命名、异常、声明顺序、注释、布局、术语、类型、语言、STL、性能、设计
│   │   └── examples/             # 结构、命名、注释、异常的正反例
│   ├── building-cpp/             # 第 5–7 步
│   │   ├── SKILL.md
│   │   ├── steps/05-build.md … 07-check.md
│   │   ├── references/           # 环境、CMake、静态检查、构建脚本、链接
│   │   ├── examples/             # 环境、CMake、工具配置
│   │   ├── assets/
│   │   │   ├── config/           # .clang-format/.clang-tidy/.clangd/.vscode
│   │   │   ├── cmake/            # 警告、GoogleTest、RPATH 模块
│   │   │   └── templates/projects/
│   │   │       ├── common/running-build.sh
│   │   │       ├── single/
│   │   │       ├── multi/
│   │   │       ├── static-library/
│   │   │       └── shared-library/
│   │   └── scripts/checking-environment.mjs
│   ├── teaching-cpp/             # 教程写作四步
│   │   ├── SKILL.md
│   │   ├── references/           # 讲解方法、章节顺序、示例验证、教学代码风格、术语
│   │   └── examples/             # 完整示例、片段、练习
│   └── python-cpp-interop/       # Python 外围编排
│       ├── SKILL.md
│       ├── references/           # 协议、进程边界、本地 HTTP、绑定取舍
│       └── assets/               # replay.py、web_bridge.py、snapshot_demo.cpp
├── templates/cpp-workflow-project/   # 复制到目标仓库的项目技能
├── docs/                         # 创建参考、结构、校验记录
├── scripts/checking-skill-links.mjs
└── tests/                        # provider + checker
```

## 技能发现

`src/index.ts` 只导出 `name`、`inject` 和 `apply()`：

- `inject = ['skills']`，`apply(ctx)` 只调用 `ctx.skills.registerProvider(...)`。
- provider 名 `dsh-cpp-workflow`，rank **550**。rank 数值越小优先级越高：项目 `.agents/skills` 的 200 在同名时胜出，bundled 的 600 低于本插件。
- `list({ cwd })` 先找 `cwd` 到 git 根的最近 git 根；`cwd` 到 git 根沿途某一层存在 `.agents/skills/cpp-workflow-project/SKILL.md`，或 git 根内同时存在 `CMakeLists.txt` 与 C++ 源文件/头文件时返回四个候选。只有 CMake、只有 C++ 示例、或证据在 git 根之上都返回空数组。
- 发现扫描有界：最多 6 层、1500 个目录项，跳过 `.git`、`build`、`node_modules`、`vendor`、`third_party`、`_book` 等目录；两半都命中后立即停止。
- 只返回 `building-cpp`、`developing-cpp`、`python-cpp-interop`、`teaching-cpp` 四个候选；`skills/` 下其他目录不会被发现。
- `get(candidate)` 只服务本 provider 的 candidate，`locator` 必须解析到本包 `skills/` 之内，然后重新读 `SKILL.md` 正文；调用方带 `cwd` 时重新过门禁，防止同一会话切到非 C++ 目录。

技能目录是**一层**：`skills/<name>/SKILL.md`，官方发现不递归。`steps/`、`references/`、`examples/`、`assets/` 都由 `resourceBase` 指向技能目录，由正文里的相对路径按需读取。

## 四个技能的分工

| 技能 | 步骤 | 负责 | 不负责 |
| --- | --- | --- | --- |
| `developing-cpp` | 1 定行为、2 定边界、3 定声明、4 定实现 | `.h` / `.cpp`、命名、异常、源码注释、库与程序边界、类型与数值、STL、性能、领域建模 | CMake、`.clang-*`、构建脚本、教材正文、Python 编排 |
| `building-cpp` | 5 定构建、6 定工具配置、7 通过检查 | CMake target、Ninja、编译数据库、clang-format/tidy/clangd、环境校验、链接与运行库 | 源码语义、命名、异常正文 |
| `teaching-cpp` | 教程四步：读者任务、概念顺序、最小示例、实测输出 | 教材章节、讲解方法、示例与练习、术语口径、示例验证 | 另立一套源码/构建规则 |
| `python-cpp-interop` | 协作边界：子进程、协议、本地 HTTP、绑定取舍 | Python 驱动、快照回放、超时与 stderr、`ctypes` / `pybind11` 决策 | C++ 规则语义 |

路由表在每个 `SKILL.md` 顶部。同一次改动跨过边界时，先完成 `developing-cpp` 的第 2 步，再开 `building-cpp`；不要在一个技能里写另一个技能的文件。编译失败按诊断位置分诊：函数体/类型回第 4 步，头文件/链接/数据库/工具 PATH 回第 5、6 步。教材章节先走 `teaching-cpp`，代码示例一旦要动源码或构建，仍回前两个技能。

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

模板本身不是可加载技能：三个轴故意留空，工程名和入口命令是占位符。复制后先填事实，再让四个技能读取。模板的 `SKILL.md` 带 P0 硬约束、Windows 宿主 → WSL 构建的入口示例，以及行为表；教材或长周期工程可以再加一张「目标｜章节正文｜代码目录｜专项必读｜状态」映射表，但不能替代行为表。

## 资产如何进入项目

`building-cpp/assets/` 是脚手架来源，不是运行时代码：

1. 先读项目 `environment.json`，确认三轴合法。
2. 只复制**缺失**的文件：`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/`、`cmake/` 模块、`running-build.sh`。
3. 不覆盖已有 `CMakeLists.txt`、`.clang-*`、`.vscode` 或源码；已有配置先读再决定是否合并。
4. 项目需要 CMake 助手时，把 `assets/cmake/*.cmake` 复制到项目 `cmake/`，在顶层加 `CMAKE_MODULE_PATH` 后 `include()`；不要从插件目录直接 `include`。
5. 项目入口命令写进项目 `SKILL.md`；模板默认 `./running-build.sh clang` 或 `./running-build.sh gcc`，实际以项目为准。
6. 四个 CMake 模板都带 `enable_testing()` 和 `app_smoke`，首次 `ctest` 不会出现「No tests were found」却仍算通过；真实行为测试再按公开头文件补。

`running-build.sh` 是 POSIX build host 脚本，适用于 Linux、macOS 和 Windows + WSL。Windows 原生（`host=windows` + `build_host=native`）是合法声明，但本版本没有 PowerShell 版本；`--live` 会明确报告缺的是 shell，不是编译器。项目尚未放 `.clang-format` 时，脚本用 `--fallback-style=Google`，避免落到 clang-format 的 LLVM 默认风格。

## Python 协作资产

`skills/python-cpp-interop/assets/` 提供三个不绑定领域的骨架：

- `replay.py`：按版本读 JSON 行快照，校验 `version`、`sequence`、9 个格、玩家与状态；用 `subprocess.run` 一次输入移动序列，stdout 只保留以 `{` 开头的行。
- `web_bridge.py`：线程化本地 HTTP 适配器，只绑定 `127.0.0.1`，限制请求体，单个会话加锁，后台线程抽取 stdout/stderr，显式关闭子进程。
- `snapshot_demo.cpp`：最小 C++20 协议端，只输出快照，不打印人类提示；配合 `assets/README.md` 的编译与重放命令验证两个 Python 脚本。

三者的约定是 stdout 每行一个 JSON 对象，日志和错误说明走 stderr；视图层不能靠解析「请选择」类提示同步状态。优先让 C++ 提供 `--protocol` 之类的显式模式，把提示和日志移到 stderr。

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
npm run check      # build + 结构/链接/shell/模板/包元数据 + 同一组样例测试
npm run pack:check # npm pack --dry-run
```

结构检查覆盖：技能文件是否存在、步骤编号与 H1、frontmatter 名称与 C++20、禁止词汇（知识库 id、`.agents/`、项目专属类名）、反引号相对路径、`bash -n`、项目模板三轴为空、`package.json` / patch / locale / icon；随后运行 `tests/` 的 provider 门禁与 checker 样例。它不编译 C++ 模板；模板编译属于目标 build host 的验收。
