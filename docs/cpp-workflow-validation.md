# 流程与约定校验

这份文档记录本插件为什么采用现在的七步顺序、哪些结论来自官方文档、哪些来自对 `D:\Github\cpp-board-games` 的逐文件审计，以及哪些地方是有意偏离 Google C++ Style Guide 的。它是设计记录，不是给技能运行时的规则；技能正文在 `skills/`。

## 结论摘要

1. 七步顺序成立：先定可观察行为，再定边界，再定声明，再定实现，然后才定构建、工具配置和通过检查。后一步发现前一步不完整时退回，不在当前层打补丁。
2. 顺序上做了两处收紧：第 5 步先做环境**静态**校验，第 7 步跑入口命令前再做 `--live`。原计划只在第 7 步做 live，会让非法的 `host/build_host/compiler` 组合先进入 configure。
3. `cpp-board-games` 的规则大部分可复用，但它的运行环境被写死为 WSL + Clang + libc++，模板也用了全局 CMake 设置；本插件把环境拆成三轴，并把标准、include、警告都放回 target。
4. Google 风格作为基线，例外逐条写进 `skills/developing-cpp/references/google-cpp-style.md` 的偏差表。最重要的例外是异常：Google 禁止异常，本项目只在合同违反和程序边界使用异常，可预期失败仍用返回值。
5. `std::format` 是 C++20 的输出组合工具，但不是 `std::print`。检查器必须实际编译并运行一个 `<format>` 探针，不能只看编译器版本。

## 七步顺序审计

| 步 | 产出 | 为什么必须在这个位置 | 发现前一步不完整时 |
| --- | --- | --- | --- |
| 1 定行为 | 一句可验收的行为 | 没有可观察行为就无法判断边界和接口是否必要 | 回到用户确认行为，不进入 2 |
| 2 定边界 | 库与程序的责任、依赖方向 | 先决定谁拥有状态和 I/O，后面的声明才有归属 | 回到 1 补行为，或把程序层职责移出库 |
| 3 定声明 | 头文件、命名、声明顺序、合同 | 公共 API 是实现的输入；先写清合同，实现才不会反向塑造接口 | 回到 2 调整边界 |
| 4 定实现 | `.cpp` 的操作顺序、分组、注释 | 实现只兑现第 3 步的声明，不偷偷扩大 API | 回到 3 改声明；不要只在 `.cpp` 里加参数 |
| 5 定构建 | CMake target、生成器、编译数据库 | 源码形状稳定后，target 和源文件列表才有意义 | 回到 2/3/4；构建不能掩盖源码结构问题 |
| 6 定工具配置 | `.clang-format`、`.clang-tidy`、`.clangd`、编辑器 | 工具要读取第 5 步的编译数据库和源码范围 | 回到 5 修 target 或数据库，不要用配置屏蔽真问题 |
| 7 通过检查 | 环境 live、入口命令、CTest、运行 | 最后才把环境、工具和源码放在一起验证 | 按失败位置分诊：类型/函数体回 4，头文件/链接/数据库回 5/6 |

### 为什么不是「先建工程再写代码」

先建 CMake 再写源码，容易让 target 结构替用户决定库和程序的边界，最后把终端输出塞进库、或把 `main()` 编进库。第 1、2 步先固定可观察行为和依赖方向，第 5 步只是把已经决定的结构写进 CMake。

### 为什么工具配置在构建之后

`clangd` 需要 `compile_commands.json`，`clang-tidy` 需要 `-p build/<compiler>`。没有第 5 步的数据库，第 6 步的配置只能靠猜 include 路径，诊断会大量落在系统头或找不到头上。工具配置放在构建之后，配置才有可验证的输入。

### 两处收紧

- **第 5 步静态校验**：`environment.json` 的三轴为空、值未知或组合非法（例如 `host=linux` + `build_host=wsl`）时，在 configure 之前停住。检查器静态模式不碰 PATH，退出码 2。
- **第 7 步 live 校验**：在声明的 build host 上检查 PATH 角色、版本和 `std::format` 探针，通过后才跑项目入口命令。失败退出码 3；不安装、不下载、不改 PATH。

## cpp-board-games 约定审计

审计范围：`.agents/skills/cpp-teaching/developing-cpp/`、`.agents/context/conventions/cpp-teaching/`、`.agents/knowledge/cpp-teaching/cases/`、`.agents/context/glossary/cpp-terms.md`，以及 `assets/` 下的配置、CMake 模块和项目模板。只读审计，本轮没有修改该仓库。

### 可复用的部分

- P0 约束的方向正确：C++20、CMake、Ninja、CTest、target-based CMake、库与程序分离、`app` 作为程序 target、项目自己拥有 `.clang-*`。
- 命名与声明顺序的条文足够具体：类型/函数 PascalCase、变量 snake_case、私有成员尾随 `_`、常量 `k` 前缀、命名空间小写；类内顺序和命名空间作用域顺序都可直接检查。
- 异常分层清楚：领域失败用结果类型，合同违反才抛，CLI 边界可捕获并打印。这比「一律禁止异常」更适合本项目的用户要求。
- 注释分层可操作：文件头、责任段 banner、声明合同、实现理由、`TODO` 格式；配置注释只写理由，不写政策。
- 构建脚本的阶段顺序正确：无条件 reconfigure → 构建 → 格式/静态检查 → CTest → 运行。

### 不能直接复用的部分

| 现状 | 问题 | 本插件的做法 |
| --- | --- | --- |
| 固定 WSL Ubuntu + Clang + libc++ | 把平台、build host 和编译器压成一个事实，Linux/macOS/GCC 工程无法声明 | 拆成 `host` / `build_host` / `compiler` 三轴，组合由检查器验证 |
| 模板用 `add_compile_options(-stdlib=libc++)`、全局 `CMAKE_CXX_STANDARD 20` | 全局开关污染所有 target，且强制 libc++ 与 GCC 冲突 | `target_compile_features(... cxx_std_20)`、按 target 设置 include/链接/警告，不写 `-stdlib` |
| 构建脚本固定 `clang++`，构建目录 `build/` | 换编译器要改脚本；两套编译数据库会互相覆盖 | 脚本接收 `clang\|gcc`，目录 `build/clang`、`build/gcc`，根 `build/compile_commands.json` 指向当前数据库 |
| 静态检查把 `.h` 也传给 clang-tidy | 头文件通常没有独立编译命令，clang-tidy 会报找不到编译数据库或跳过 | 格式检查收全部 `.cpp/.h/.hpp`；clang-tidy 只收 `.cpp` |
| 模板没有 CRLF 拦截 | Windows 编辑器可能写回 CRLF，格式检查通过但 diff 噪声大 | 脚本先列出含 CR 的文件并失败 |
| `run.ps1 build <game>`、`games/<game>`、`bg-*` 条目 | 与棋盘游戏和知识库强绑定，通用工程无法照搬 | 通用技能不出现游戏/知识库词汇；项目事实放 `.agents/skills/cpp-workflow-project/` |
| 模板的 `running-build.sh` 与 CMake 模板不完全一致 | 文档承诺 SHARED 处理，模板却没有 `run_with_stage_libs` | 新模板按 single/multi/static/shared 分别生成，共享库用 `BUILD_RPATH` |
| Windows 原生没有 PowerShell 版本 | `host=windows` + `build_host=native` 是合法声明，但当前版本跑不了 | 明确缺口：静态合法，`--live` 报告「缺的是 shell，不是编译器」，不伪造通过 |

### 已采纳但改写过的部分

- Google 命名、声明顺序、头文件自包含、`explicit`、NSDMI、`[[nodiscard]]`、命名转换、非 Yoda 比较、半开区间、`unique_ptr`、命名 cast：保留。
- 注释 banner、`///` 合同、`TODO: <stage or issue> - <what>`、配置注释只写理由：保留，去掉游戏和知识库路径。
- CMake 的 target 顺序、`enable_testing()`、`compile_commands.json`、输出目录、RPATH：保留，并补上 `build/<compiler>` 与数据库软链接。
- 异常消息格式：保留「API 名 + 参数 + 期望范围」，用 `std::format` 直接构造消息；不引入 fmt、Abseil 或自定义异常类型。

## Google C++ Style Guide 偏差表

基线：`https://google.github.io/styleguide/cppguide.html`（已核对「target C++20、不用 C++23」、命名、include 顺序、声明顺序、异常、cast、`#pragma once` 等章节）。

| Google 规则 | 本项目 | 理由 |
| --- | --- | --- |
| 不使用 C++ 异常 | 合同违反/程序边界可抛；可预期失败用结果类型 | 用户明确要求「能使用异常的地方使用合理的异常」；同时避免用异常表达正常拒绝 |
| 用 include guard，不用 `#pragma once` | 用 `#pragma once` | 单一编译器、单一构建系统下更短；已写进偏差表，不混用两种 |
| 80 列 | 100 列 | 模板、`std::format` 串和诊断消息在 80 列下换行过碎；团队统一 |
| 访问器可用 snake_case | `Get` + PascalCase | 与类型/函数命名统一，查询语义显式；`Get` 前缀是项目契约 |
| 源文件 `.cc` | `.h` / `.cpp` | 现有工程和编辑器默认配置；不影响语义 |
| 用 `cpplint.py` | clang-format + clang-tidy | 自动修复和编译数据库集成更好；不额外维护 Python 工具 |
| 项目头按源根相对路径包含 | 从组件 `PUBLIC include/` 裸文件名包含 | 组件边界清晰，禁止 `"ns/..."` 和尖括号项目头 |
| 不规定枚举底层类型 | 封闭状态枚举用 `enum class Name : std::uint8_t` | 状态码数量有限，固定底层类型便于序列化和 ABI 稳定；坐标不用 |
| `int` 表示尺寸/坐标 | 保留 `int`，但越界检查同时查负数和上界 | Google 允许 `int`；项目把「负数也非法」写成显式合同 |
| C++20，不用 C++23 | 相同；输出用 `std::cout << std::format(...)` | C++20 没有 `std::print`；不引入 C++23 |
| 不用 `using namespace`、不在 `std` 里声明 | 相同 | 保持 |
| 尽量用返回值，少用输出参数 | 相同 | 保持 |
| 单参数构造函数 `explicit` | 相同；零参数不标 | 保持 |

## std::format 与工具链证据

- GCC 13 的发布说明列出 libstdc++ 增加 `<format>` 和 `std::format`：`https://gcc.gnu.org/gcc-13/changes.html`。因此 GCC 模式要求 `g++ >= 13`，并且实际探测 `<format>`。
- libc++ 的 C++20 状态页把 P0645R10 Text Formatting 标为 Complete，首次发布在 LLVM 14；功能测试宏到 LLVM 19 才设置：`https://libcxx.llvm.org/Status/Cxx20.html`。因此不能只看 `__cpp_lib_format`，要看真实编译运行结果。
- `std::print` 是 C++23，C++20 不可用。技能统一要求 `std::cout` / `std::cerr` 配合 `std::format`，或沿用工程已有的流。
- 检查器的探针是一个最小程序：`#include <format>`、`std::format("hello, {}\n", name)`，编译后运行，输出必须是 `hello, cpp`。版本号只用于给出更早的、可读的失败原因。

## CMake 与 clangd 证据

- `CXX_STANDARD` 的 `20` 值自 CMake 3.12 起支持：`https://cmake.org/cmake/help/latest/prop_tgt/CXX_STANDARD.html`。本插件仍要求 CMake 3.20，因为模板使用了较新的策略和 `FetchContent` 行为。
- `CMAKE_EXPORT_COMPILE_COMMANDS` 只对 Makefile 和 Ninja 生成器生效；本项目固定 Ninja，所以 `build/<compiler>/compile_commands.json` 可用。
- 模板在 `target_compile_features(... cxx_std_20)` 之外设 `CXX_EXTENSIONS OFF`，把 CMake 默认的 `-std=gnu++20` 收紧为 `-std=c++20`；这是 CMake target 属性，不是全局 `CMAKE_CXX_FLAGS`。
- 计划要求采用 `dsh-code-navigator` 的根目录、`build/`、`out/build/` 查找顺序。npm 包存在，但本轮没有读它的实现，无法确认 `out/build/`；实现只保证根 `build/compile_commands.json` 和 `build/<compiler>/`，不生成 `out/build/`。这是有意收窄，不声称完整采用未验证的约定。
- Ninja Multi-Config 会为同一源文件写多条命令，clangd 默认取第一条。计划引用了 clangd#2026；本轮没有独立复核该 issue，但单配置 Ninja 加按编译器分目录本身避免了这个问题，所以固定单配置。
- `--query-driver` 是 **clangd 的命令行参数**，不是 `.clangd` 的 YAML 键：`https://clangd.llvm.org/guides/system-headers`。计划原文把它写成首次复制 `.clangd` 时按编译器轴写入；这是不准确的落点。实现保留意图，把绝对路径写进 `.vscode/settings.json` 的 `clangd.arguments`，`.clangd` 只负责 `CompilationDatabase` 和诊断开关，并给出 clang→`build/clang`/`clang++`、gcc→`build/gcc`/`g++` 的复制映射。
- clang-format / clang-tidy 的配置使用了 16 才开始稳定的选项和检查，因此 GCC 模式也要求这两件工具 `>= 16`；Clang 模式还要求 `clang++`、`clang-format`、`clang-tidy`、`clangd` 同一 LLVM 主版本。Apple Clang 与 Homebrew LLVM 版本不同是常态，检查器跳过同主版本要求、提示 clangd 需经 `xcrun` 找到 SDK，但仍要求工具 `>= 16`。

## 环境三轴与已知边界

| host | build_host | 含义 | 本版本 |
| --- | --- | --- | --- |
| windows | wsl | Windows 上在 WSL 里构建 | 支持，POSIX 脚本 |
| windows | native | Windows 原生构建 | 声明合法，但没有 PowerShell 构建脚本；`--live` 明确报告缺口 |
| linux | native | Linux 原生 | 支持 |
| macos | native | macOS 原生 | 支持；Apple Clang 例外，真实 GCC 需自行安装 |
| linux/macos | wsl | 非法组合 | 静态校验退出 2 |

- 一个仓库只有一份 `environment.json`；不按 target 或子目录切换编译器。
- 生成器固定 Ninja；编译器每 configure 只选一个；构建目录固定 `build/<compiler>`。
- 不提供 MSVC/clang-cl、C-only、调试器、ASan、vcpkg/Conan、Debug/Release 轴；这些是 v1 的非目标。
- 不修改 `cpp-board-games`；本轮只把它当规则来源和审计对象。

## 架构参考

- DSH 技能子系统文档：`https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills`。`SkillProvider` 是 `{ name, list(options), get(candidate, options) }`，通过 `ctx.skills.registerProvider` 注册；项目级发现 rank 200，bundled rank 600。本插件用 rank 550，位于两者之间：项目技能同名时 rank 200 胜出。
- 发布文档：`https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish`。bundle 用 `dsh.bundle.patch` 组合，`engines.dsh` 是硬范围；本包只插入一行 `id: cpp-workflow`，不替换官方行。
- 参考包 `D:\Github\dsh-quarto-book`：同样的 `src/index.ts` → `lib/index.js`、`skills/<name>/SKILL.md`、locale、icon、bundle patch、工作区门禁；本插件复用这套包形，但把门禁从 `_quarto.yml` 换成项目技能标记。
- 下载量快照：`https://www.dsh.so/data/npm-downloads.json`（2026-10-18 生成，窗口 2026-10-11..18，前 100 名）。前 100 没有 C++ 专用插件；`dsh-embedded-workbench@0.9.4` 是最接近的 C/C++ 参考，采用一个 bundle 加多个技能和 references 的形态。因此本插件不发明新的运行时协议，只按 DSH bundle + skill provider 的官方形状实现。
- `@dsh-lsp-packs/dsh-lsp-cpp` 在 npm registry 返回 404，无法作为依赖或设计依据；`dsh-code-navigator@0.1.0` 存在，但它的编译数据库实现细节本轮没有确认，所以只作为生态观察，不进入实现。`dsh-embedded-workbench` 的 C++ 内容和多技能布局已检查，作为结构参考。

## 本轮验证记录

在 2026-10-20 的本机与 WSL Ubuntu 上执行：

- `npm test`：24 个测试通过（provider 门禁 9 个、checker 静态/CLI/live 分支 15 个）。测试只用临时目录和 fixtures，不依赖本机 C++ 工具链。
- `npm run check`：`tsc --noEmit` 无错误，结构检查输出「结构检查通过」；`bash -n` 覆盖随包脚本。
- `npm run pack:check`：`npm pack --dry-run` 成功，包内 69 个文件，包含 `lib/`、两个技能、模板、docs、locale、patch、icon 与两个 README；包大小 79.4 kB，解包 214.9 kB。
- WSL Ubuntu（clang 21.1.8、cmake 4.2.3、ninja 1.13.2）真实编译并运行 `single`、`multi`、`static-library`、`shared-library` 四个模板：configure、构建、编译数据库软链接、换行检查、clang-format、clang-tidy、CTest `app_smoke`、`app` 全部通过，输出 `Hello, C++20!`；编译数据库里的标准是 `-std=c++20`（不是 `gnu++20`）。
- 同一 WSL 内独立验证 `std::format` 探针：`clang++ -std=c++20` 编译并输出 `hello, cpp`。
- 把 `assets/config/.clang-format` 与 `.clang-tidy` 放进四个模板后再跑：`misc-include-cleaner` 先报 `multi` 的 `greeting.cpp` 没有直接包含 `<string>`/`<string_view>`，补上后四个模板的格式、静态检查、CTest、运行全部通过。这条真实失败证明「模板能用」和「模板配自己的配置也能用」是两件事。
- `--live` 的 Windows 原生分支在本机验证：`host=windows`、`build_host=native`、`compiler=clang` 返回退出码 3，消息明确指出缺的是 PowerShell shell，而不是编译器。
- 未把 `--live` 的 WSL 分支在 WSL 内跑通：该发行版没有 Node.js。检查器的 WSL 平台/环境判断由代码与单测覆盖，真实 live 验收仍需在装了 Node 的 WSL 里执行；macOS 实机与 GCC 模式也未实机验证，见下文。

模板验收时发现并修正了两处：项目没有 `.clang-format` 时脚本回退到 clang-format 的 LLVM 默认风格，会误报 `}  // namespace`；现在显式加 `--fallback-style=Google`。四个模板也加了 `enable_testing()` 与 `app_smoke`，避免 CTest 输出 “No tests were found” 却仍算通过。

## 仍未验证/不承诺

- 没有 Top 1000 下载量的完整数据；只有 dsh.so 的前 100 快照。排名会变，本文只把它当架构样本，不作为依赖。
- 没有对所有 DSH 版本做兼容性矩阵；`engines.dsh` 写的是 `>=0.2.0-rc.1 <0.3.0-0`。
- 没有在 macOS 实机跑 Apple Clang 例外；规则来自版本输出和官方状态页，检查器逻辑有单测但未实机验证。
- Windows 原生构建缺口是明确的产品限制，不是待修的隐式 bug；要支持就得补 PowerShell 入口，并同步项目模板和文档。
