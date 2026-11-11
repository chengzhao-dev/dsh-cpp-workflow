---
name: building-cpp
description: 在已写好 CMake 的 C++11–C++23 工程上配置、构建和检查时使用：Ninja、compile_commands.json、CTest 失败、clang-format、clang-tidy、clangd、environment.json、running-build.sh 与工程内已有的 `.vscode/` 接线。不用于只改源码语义、文档、Python 或与 C++ 无关的文件。
metadata:
  short-description: C++11–C++23 构建流程
---

# building-cpp

本技能处理环境声明、构建入口与工具配置：`environment.json`、`running-build.sh`、`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/`、构建命令、编译数据库、CTest 与运行。加载顺序与层表见 [budget.md](../shared/budget.md)。

## 适用场景

- **负责**：环境四轴与构建入口；工具配置的复制、落地与检查（规则条文归 `engineering`）；编码、声明校验、活动校验、项目入口命令的次序。
- **不负责**：`CMakeLists.txt` 与 `cmake/` 下的 target、属性、标准与模块开 `engineering`，本技能只读它们来配置和检查，不在这一步改 target 图；函数体、类型、命名、异常与源码注释开 `developing-cpp`。
- **交接**：一次改动同时碰到源码和构建文件时，先开 `developing-cpp` 定行为、边界与实现；需要新增或移动源文件、改库与程序的边界、补测试 target 时，转 `engineering` 把文件写进 CMake；最后回到本技能定工具配置并通过检查。只改函数体、命名、异常或注释且入口命令可运行时，定实现后只开本技能的通过检查。
- **前置**：存在项目技能 `cpp-workflow-project` 时先读它的 `SKILL.md`、`environment.json` 和 `stages/stage-table.md`。三个环境轴为空、`standard` 非法或组合非法时停在定构建，不猜 WSL、Clang 或构建目录；`standard` 缺失或为空时按默认 `c++23` 继续并提示声明升级；`windows` + `native` 直接拒绝，提示「本版本不能在 Windows 原生壳里构建」，不给补 PowerShell 的路线。
- **分因**：编译失败时先看诊断指向哪一层。函数体问题回 `developing-cpp` 的定实现；找不到头、链接失败、target 不存在或标准不对转 `engineering` 的对应步骤；没有编译数据库、format/tidy 不在 PATH 或配置不生效留在本技能的定工具配置。
- **编码**：源码与构建文件用 UTF-8 无 BOM、检出 LF，`.bat` / `.cmd` 用 CRLF，`.clang-format` 写 `LineEnding: LF`；MSVC 原生构建优先加 `/utf-8`，不靠 BOM 过关。完整规则见 `../engineering/references/formatting/01-encoding.md`，机器规则以仓库根 `.gitattributes` 与 `.editorconfig` 为准。
- **编辑器**：工程根已有 `.vscode/` 时按 `steps/04-vscode.md` 接线；从当前目录向上到 git 根都没有 `.vscode/` 时不打开、也不新建。配置、构建、运行和调试都从 CMake Tools 进入，构建仍以 `running-build.sh` 为准。

## 三种操作

一次只选一种操作，范围（单点、整段）是任务属性；判据、边界与交接见共用入口 [operations.md](../shared/operations.md)。本技能从 [01-build.md](steps/01-build.md) 进；四类改动是域，不是操作。

| 操作 | 什么时候用 | 从哪步进 |
| --- | --- | --- |
| 写作（起稿） | 改环境轴、入口脚本或构建流程 | 第 1 步；新工程走到第 3 步 |
| 改写 | 环境轴与 target 契约不变，工具配置位置或流程顺序不对 | 从第 2 步重走，可到第 3 步 |
| 润色 | 只改诊断措辞或失败分流说明 | 第 3 步 |

- 不发明项目没有声明的环境轴、命令和 target；只改格式或配置时不改可观察行为。
- 不覆盖已有源码、`CMakeLists.txt` 和 `.clang-*`；不安装工具链；代理侧不写 `wsl` 或 `bash -lc`。
- 后一步发现前一步没做完，退回那一步；发现环境轴、编译器、构建目录或 target 契约需要改，整段退回并转 `engineering`。

## 步骤

| 步 | 名称 | 文件 | 一句话 |
| --- | --- | --- | --- |
| 1 | 定构建 | `steps/01-build.md` | 读环境声明，固定 Ninja 与单一编译器，产出编译数据库 |
| 2 | 定工具配置 | `steps/02-tooling.md` | 格式化、静态检查、clangd 各管一段，互不越界 |
| 3 | 通过检查 | `steps/03-check.md` | 按编码 → 声明校验 → 活动校验 → 项目入口的次序跑，前一步失败就停 |
| 4 | VS Code 接线 | `steps/04-vscode.md` | 工程已有 `.vscode/` 时在第 2 步内接扩展与设置，没有时不新建 |

每步只打开同号的一个步骤文件；第 2 步在工程已有 `.vscode/` 时额外读 `04-vscode.md`。判不准才打开 `examples/` 里与该步对应的案例；`references/` 保存完整条文，只在排错、整目录重构，或步骤里明确指向某一条时打开。

## 入口表

| 要做的事 | 打开 |
| --- | --- |
| 读环境轴、配置与构建 | `steps/01-build.md`；条文 `references/02-environment.md`；案例 `examples/environment.md` |
| 配 `.clang-format`、`.clang-tidy`、`.clangd` | `steps/02-tooling.md`；条文在 `../engineering/references/formatting/`，一次一份 |
| 工程已有 `.vscode/`，接扩展与设置 | `steps/04-vscode.md`；没有 `.vscode/` 不打开也不新建 |
| 编码、声明校验、活动校验与入口命令 | `steps/03-check.md`；条文 `references/01-build-script.md` |
| 新工程模板与可复制配置 | `assets/templates/projects/`、`assets/config/` |
| 操作判不准、规则冲突 | `../shared/operations.md`、`../shared/rule-priority.md` |

链接、rpath 与产物布局读 `../engineering/references/cmake/linking/01-libraries.md`；测试设计、断言与 CTest 注册读 `../engineering/references/cmake/testing/01-ctest.md`；CMake 的 target、标准与函数写法读 `../engineering/references/cmake/`，可复用片段在 `../engineering/references/cmake/assets/`。

## 加载预算

加载预算见 [budget.md](../shared/budget.md)；building-cpp 的步骤固定 4 份。

项目技能列出了检查命令时只跑那一条，没有时跑本技能自己的 `scripts/checking-environment.mjs` 与 `../engineering/scripts/checking-encoding.mjs`；退出码为 0 后停在这一步，不再继续走没有失败的步骤。入口脚本只做配置、构建、CTest 与最小运行；`clang-format` 与 `clang-tidy` 的手动检查留在定工具配置，不塞进入口脚本。`environment.json` 的三个环境轴与 `standard` 是唯一来源，缺项就停。

## 四类改动

四类改动是操作内部的域：操作定入口，域定层次。四域的定义、边界与次序见 [operations.md](../shared/operations.md)；building-cpp 的一次改动混了两类时，按「内容 → 结构 → 版式 → 措辞」拆开做，前一类落定并经检查再进下一类。

| 类型 | 典型请求 | 入口步骤 |
| --- | --- | --- |
| 内容 | 改环境轴、入口脚本或构建流程 | `steps/01-build.md` |
| 结构 | 移动工具配置文件、接 `.vscode/` 扩展与设置 | `steps/02-tooling.md` |
| 版式 | 只改编码、行尾或 clang-format | `steps/02-tooling.md` |
| 措辞 | 只改诊断措辞、失败分流说明 | `steps/03-check.md` |

## 完成判据

- [ ] 项目 `environment.json` 的三个环境轴齐全且是合法组合，`standard` 在 `c++11`–`c++23` 内；新工程默认 `c++23`，没有靠猜。
- [ ] 配置命令固定 Ninja 和单一编译器，`build/<compiler>/compile_commands.json` 存在，根 `build/compile_commands.json` 指向当前编译器。
- [ ] target 契约已经成立：程序 `app`、库 target、公共 include、标准与输出目录都已由 `engineering` 写好；本技能没有偷偷改 CMake 来绕过失败。
- [ ] `clang-format --dry-run --Werror` 与 `clang-tidy` 在项目源码上零告警；只扫描项目源码和项目头。
- [ ] CTest 全绿，程序从该编译器的构建目录启动；有测试时注册用 `gtest_discover_tests` 或项目既有机制，运行带 `--output-on-failure --no-tests=error`，失败时报告的是具体角色和原因。
- [ ] 没有改源码语义，没有覆盖已有工程文件，也没有安装或下载任何工具。
- [ ] 工程有 `.vscode/` 时，扩展与设置按 `steps/04-vscode.md` 接好；没有时不新建，也没有 `tasks.json` 或 `launch.json` 另起构建。
