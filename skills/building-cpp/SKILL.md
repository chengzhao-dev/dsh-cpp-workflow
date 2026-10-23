---
name: building-cpp
description: 用 CMake、Ninja、clang-format、clang-tidy、clangd 配置、构建和检查 C++11–C++23 工程时使用；新工程默认 C++23；按定构建、定工具配置、通过检查三步推进。一次改动同时碰到源码和构建文件时，先打开 developing-cpp。不用于只改源码语义、文档、Python 或与 C++ 无关的文件。
metadata:
  short-description: C++11–C++23 构建三步
---

# building-cpp

## 适用场景

管 `CMakeLists.txt`、`cmake/`、`running-build.sh`、`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/` 和 `environment.json`。函数体、类型、命名、异常和源码注释只开 `developing-cpp`。一次改动同时碰到源码和构建文件时，先打开 `developing-cpp`：只改函数体、命名、异常或注释且入口命令可运行时，定实现后直接到本技能的通过检查；新增或移动源文件、改库与程序的边界、补测试 target 时，到本技能先做定构建，把文件写进 CMake，再决定是否定工具配置，最后通过检查。`.qmd`、仓库 README、Python 和非 C++ 文档不打开本技能。

编译失败先分因：诊断指向函数体，回 `developing-cpp` 的定实现；诊断指向声明或类型，回定声明；诊断是找不到头、链接失败、没有编译数据库或工具不在 PATH，留在本技能的定构建或定工具配置。

源码和构建文件用 UTF-8 无 BOM、检出 LF；`.bat` / `.cmd` 用 CRLF；`.clang-format` 写 `LineEnding: LF`。MSVC 原生构建优先加 `/utf-8`，不要靠 BOM 过关。完整规则见 `references/encoding.md`，检查脚本是 `scripts/checking-encoding.mjs`，机器规则以仓库根 `.gitattributes` 与 `.editorconfig` 为准。

存在项目技能 `cpp-workflow-project` 时先读它的 `SKILL.md`、`environment.json` 和 `stages/stage-table.md`。三个环境轴为空、`standard` 非法或组合非法时停在定构建，不猜 WSL、Clang 或构建目录；`windows` + `native` 直接拒绝，提示「本版本不能在 Windows 原生壳里构建」，不要给出补 PowerShell 的路线。环境组合空着时源码四步仍可做，只是不能构建。

## 两种走法

| 走法 | 什么时候用 | 怎么做 |
| --- | --- | --- |
| 增量修正 | 用户点了一条链接错误、一个工具配置或一条诊断 | 先判断属于定构建还是定工具配置，只改那一处，不动无关 target 和配置 |
| 整段重构 | 新工程、新阶段、换环境组合，或第一次接构建 | 同样三步；先定 target 和目录，再改工具文件，最后跑完整检查 |

共同不变量：不发明项目没有声明的环境轴、命令和 target；只改格式或配置时不改可观察行为；不覆盖已有源码、`CMakeLists.txt` 和 `.clang-*`；不安装工具链；代理侧不写 `wsl` 或 `bash -lc`。后一步发现前一步没做完，退回那一步。拿不准先用增量修正；发现环境轴、编译器或构建目录需要改，退回整段，从定构建重走。

## 步骤

| 步 | 名称 | 文件 | 一句话 |
| --- | --- | --- | --- |
| 1 | 定构建 | `steps/01-build.md` | 一次配置一个编译器，Ninja，target-based CMake，编译数据库 |
| 2 | 定工具配置 | `steps/02-tooling.md` | 格式化、静态检查、clangd 各管一段，互不越界 |
| 3 | 通过检查 | `steps/03-check.md` | 先跑环境脚本的 `--live`，再跑项目入口，按失败位置分诊 |

每步只打开同号的一个步骤文件。判不准才打开 `examples/` 里与该步对应的案例；`references/` 保存完整条文，只在排错、整目录重构，或步骤里明确指向某一条文时按需打开。

## 完成判据

- 项目 `environment.json` 的三个环境轴齐全且是合法组合，`standard` 在 `c++11`–`c++23` 内；新工程默认 `c++23`，没有靠猜。
- 配置命令固定 Ninja 和单一编译器，`build/<compiler>/compile_commands.json` 存在，根 `build/compile_commands.json` 指向当前编译器。
- 标准写在 target 上（`CXX_STANDARD` + `CXX_STANDARD_REQUIRED ON` + `cxx_std_*`），`CXX_EXTENSIONS OFF`；`compile_commands.json` 的实际 `-std` 与 `environment.json` 一致，没有全局 `include_directories()` 或 GLOB。
- `clang-format --dry-run --Werror` 与 `clang-tidy` 在项目源码上零告警；只扫描项目源码和项目头。
- CTest 全绿，程序从该编译器的构建目录启动；失败时报告的是具体角色和原因。
- 没有改源码语义，没有覆盖已有工程文件，也没有安装或下载任何工具。
