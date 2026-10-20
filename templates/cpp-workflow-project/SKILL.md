---
name: cpp-workflow-project
description: 当前 C++ 工程的本地事实：工程名、入口命令、环境三轴、库与程序边界、阶段表；执行任何 C++ 任务前先读。不用于通用 C++ 规则，也不用于别的工程。
metadata:
  short-description: 当前 C++ 工程事实
---

# cpp-workflow-project

这是模板，不是可直接加载的技能。复制整个目录到目标仓库的 `.agents/skills/cpp-workflow-project/`，再把下面的事实换成该工程的真实值。通用规则在插件的四个技能 `developing-cpp`、`building-cpp`、`teaching-cpp`、`python-cpp-interop` 里；这里只记录本项目特有的、无法从源码推断的事实。

## P0 硬约束

下面几条不允许在项目里“看情况”放宽；需要放宽时先改插件规则，再改项目事实。

- 规则核心不读终端、GUI、Web、Python 或 Quarto；程序层只做装配和输入输出。
- 一个阶段对应一个可观察行为；没有验证方式的行为不进阶段表。
- 同一个工程只有一份源码树；不要为每章复制快照目录，章节用阶段表指向当前工程。
- `.clang-format`、`.clang-tidy`、`.clangd`、`.vscode` 由工程根持有；插件 assets 只在初始化时复制一次，之后以工程为准。
- 不在项目技能里复制 `developing-cpp` / `building-cpp` 的正文；项目层 rank 200 会覆盖插件，复制即分叉。

## 工程事实

| 项 | 值 |
| --- | --- |
| 工程名 | `<project-name>` |
| 一句话职责 | `<what this program does>` |
| 源码根 | `<src-root>` |
| 库 target | `<library-target or none>` |
| 程序 target | `app` |
| 入口命令 | `<entry-command>`，例如 `bash running-build.sh clang`；Windows 宿主经 WSL 构建时写 `powershell -File tools/run.ps1 build <project>`，由 PowerShell 壳转入 WSL |
| 构建目录 | `build/<compiler>` |
| 阶段表 | `stages/stage-table.md`；一个受测项目一份，例如 `stages/<project>.md` |

## 环境三轴

`environment.json` 只声明三个轴，不带默认值：

| 轴 | 允许值 | 本项目 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | `<host>` |
| `build_host` | `native` / `wsl`（仅 `host=windows`） | `<build_host>` |
| `compiler` | `clang` / `gcc` | `<compiler>` |

改任何一轴都要重走 `building-cpp` 的第 5、6、7 步；不要只改构建脚本或 `.clangd`。构建前用插件的 `checking-environment.mjs` 做静态校验，跑入口命令前再做 `--live`。

Windows 宿主 + WSL 构建时，PowerShell 壳只负责把命令转进 WSL，真正的编译、格式化、静态检查、测试仍在 WSL 文件系统里执行。壳脚本不猜路径，不改 `PATH`，不把 WSL 路径翻译散落到各处；入口命令必须能从仓库根直接运行。

## 边界

- 库负责 `<domain rules>`，不读终端、不写文件、不依赖程序层；没有独立库时写「none」，仍把可测试逻辑与终端 I/O 分开。
- 程序层负责 `<terminal input/output>`，只把流和参数传给库。
- 公开头文件位于 `<component>/include/`，程序私有头位于 `apps/include/`。
- 第三方依赖：`<none or list>`。

## 阶段表

当前阶段的可观察行为、验证方式和状态见 `stages/stage-table.md`。新增行为先加一行，再改声明与实现；不要用「重构」当阶段名。

| 阶段 | 可观察行为 | 验证方式 | 状态 |
| --- | --- | --- | --- |
| `<stage>` | `<observable behavior>` | `<command or test>` | `todo` / `doing` / `done` |

教材或长周期工程需要把章节和代码目录对应起来时，可另加一张映射表，但不要替代上面的行为表：

| 目标 | 章节正文 | 代码目录 | 专项必读 | 状态 |
| --- | --- | --- | --- | --- |
| `<goal>` | `<chapter>` | `<path>` | `<reference>` | `<status>` |

## 本工程特有约定

只写无法从通用规则推断的内容，例如：

- 领域词：`<domain term>` 指 `<meaning>`。
- 输入格式：`<format>`。
- 外部约束：`<constraint>`。

不要把 Google 风格、CMake 规则、clang-tidy 检查清单复制进来；那些由插件技能维护，复制会分叉。也不要在这个目录里放 `developing-cpp` 或 `building-cpp` 的同名技能：项目层 rank 200 会覆盖插件正文，改一份就分叉一份。
