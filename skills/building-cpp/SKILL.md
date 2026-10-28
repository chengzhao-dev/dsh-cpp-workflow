---
name: building-cpp
description: 在已经写好 CMake 的 C++11–C++23 工程上配置、构建和检查时使用：Ninja、compile_commands.json、clang-format、clang-tidy、clangd、environment.json 与 running-build.sh；按定构建、定工具配置、通过检查三步推进。要编写或重构 CMakeLists.txt / cmake 模块时先开 configuring-cmake。一次改动同时碰到源码和构建文件时，先打开 developing-cpp。不用于只改源码语义、文档、Python 或与 C++ 无关的文件。
metadata:
  short-description: C++11–C++23 构建三步
---

# building-cpp

## 适用场景

本技能处理环境声明、构建入口与工具配置：`environment.json`、`running-build.sh`、`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/`、构建命令、编译数据库、CTest 和运行。`CMakeLists.txt` 与 `cmake/` 下的 target、属性、标准和模块由 `configuring-cmake` 负责；本技能只读它们来配置和检查，不在这一步改 target 图。函数体、类型、命名、异常和源码注释只开 `developing-cpp`。

一次改动同时碰到源码和构建文件时，先打开 `developing-cpp` 定行为、边界与实现；需要新增或移动源文件、改库与程序的边界、补测试 target 时，转到 `configuring-cmake` 把文件写进 CMake；最后回到本技能做定工具配置与通过检查。只改函数体、命名、异常或注释且入口命令可运行时，定实现后只开本技能的「通过检查」。

存在项目技能 `cpp-workflow-project` 时先读它的 `SKILL.md`、`environment.json` 和 `stages/stage-table.md`。三个环境轴为空、`standard` 非法或组合非法时停在定构建，不猜 WSL、Clang 或构建目录；`windows` + `native` 直接拒绝，提示「本版本不能在 Windows 原生壳里构建」，不要给出补 PowerShell 的路线。

编译失败先分因：诊断指向函数体，回 `developing-cpp` 的定实现；诊断是找不到头、链接失败、target 不存在或标准不对，转 `configuring-cmake` 的对应步骤；诊断是没有编译数据库、format/tidy 不在 PATH 或配置不生效，留在本技能的定工具配置。

源码和构建文件用 UTF-8 无 BOM、检出 LF；`.bat` / `.cmd` 用 CRLF；`.clang-format` 写 `LineEnding: LF`。MSVC 原生构建优先加 `/utf-8`，不要靠 BOM 过关。完整规则见 `references/encoding.md`，检查脚本是 `scripts/checking-encoding.mjs`，机器规则以仓库根 `.gitattributes` 与 `.editorconfig` 为准。

## 两种走法

| 走法 | 什么时候用 | 怎么做 |
| --- | --- | --- |
| 增量修正 | 用户点了一条工具配置、一条诊断或一个入口脚本错误 | 先判断属于定构建还是定工具配置，只改那一处，不动无关 target 和配置 |
| 整段重构 | 新工程、新阶段、换环境组合，或第一次接构建 | 同样三步；先确认 target 与标准已由 configuring-cmake 写好，再改工具文件，最后跑完整检查 |

两种走法共用这些约束：不发明项目没有声明的环境轴、命令和 target；只改格式或配置时不改可观察行为；不覆盖已有源码、`CMakeLists.txt` 和 `.clang-*`；不安装工具链；代理侧不写 `wsl` 或 `bash -lc`。后一步发现前一步没做完，退回那一步。拿不准先用增量修正；发现环境轴、编译器、构建目录或 target 契约需要改，退回整段，并转 `configuring-cmake`。

## 步骤

| 步 | 名称 | 文件 | 一句话 |
| --- | --- | --- | --- |
| 1 | 定构建 | `steps/01-build.md` | 读环境声明，固定 Ninja 与单一编译器，产出编译数据库 |
| 2 | 定工具配置 | `steps/02-tooling.md` | 格式化、静态检查、clangd 各管一段，互不越界 |
| 3 | 通过检查 | `steps/03-check.md` | 按编码 → 声明校验 → 活动校验 → 项目入口的次序跑，前一步失败就停 |

每步只打开同号的一个步骤文件。判不准才打开 `examples/` 里与该步对应的案例；`references/` 保存完整条文，只在排错、整目录重构，或步骤里明确指向某一条文时按需打开。链接、rpath 与产物布局读 `references/linking.md`；测试设计、断言与 CTest 注册读 `references/testing.md`；CMake 的 target、标准和函数写法读 `../configuring-cmake/references/`，可复用片段在 `../configuring-cmake/assets/cmake/`。

本轮激活按三条上限走：

- 只开当前步对应的一个步骤文件；同一改动域内不同时展开两个技能的步骤。跨域按 `developing-cpp` 的交接顺序（源码 → `configuring-cmake` → `building-cpp`）逐段进入，前一段结论落下再开下一段。
- 条文只开该步点名的一份；同号案例留到下一次激活。
- 标准档只打开项目技能声明的那一档，没有声明时用本技能已有的新工程默认，不把其余标准档读进来。

项目技能列出了检查命令时只跑那一条，没有时跑本技能自己的 `scripts/checking-environment.mjs` 与 `scripts/checking-encoding.mjs`；退出码为 0 后在同一轮结束 goal，不再继续走没有失败的步骤。

### 四类改动

先认这次改的是哪一类，再决定从哪一步进；一次改动混了两类时，按「写作 → 布局 → 排版 → 润色」的次序拆开做。

| 类型 | 典型请求 | 从哪进 | 先读哪份条文 |
| --- | --- | --- | --- |
| 写作 | 改环境轴、入口脚本或构建流程 | 第 1 步 | `steps/01-build.md`、`references/environment.md`、`references/build-script.md` |
| 布局 | 移动工具配置文件、补 `.vscode/` | 第 2 步 | `steps/02-tooling.md`、`examples/tooling.md` |
| 排版 | 只改编码、行尾或 clang-format | 第 2 步 | `references/encoding.md`、`steps/02-tooling.md` |
| 润色 | 只改诊断措辞、失败分流说明 | 第 3 步 | `steps/03-check.md`、`references/build-script.md` |

## 完成判据

- 项目 `environment.json` 的三个环境轴齐全且是合法组合，`standard` 在 `c++11`–`c++23` 内；新工程默认 `c++23`，没有靠猜。
- 配置命令固定 Ninja 和单一编译器，`build/<compiler>/compile_commands.json` 存在，根 `build/compile_commands.json` 指向当前编译器。
- target 契约已经成立：程序 `app`、库 target、公共 include、标准与输出目录都已由 `configuring-cmake` 写好；本技能没有偷偷改 CMake 来绕过失败。
- `clang-format --dry-run --Werror` 与 `clang-tidy` 在项目源码上零告警；只扫描项目源码和项目头。
- CTest 全绿，程序从该编译器的构建目录启动；有测试时注册用 `gtest_discover_tests` 或项目既有机制，运行带 `--output-on-failure --no-tests=error`，失败时报告的是具体角色和原因。
- 没有改源码语义，没有覆盖已有工程文件，也没有安装或下载任何工具。
