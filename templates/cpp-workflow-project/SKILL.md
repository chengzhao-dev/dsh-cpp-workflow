---
name: cpp-workflow-project
description: 当前 C++ 工程的本地事实：工程名、入口命令、环境三轴、库与程序边界、阶段表；执行任何 C++ 任务前先读。不用于通用 C++ 规则，也不用于别的工程。
metadata:
  short-description: 当前 C++ 工程事实
---

# cpp-workflow-project

这是模板，不是可直接加载的技能。复制整个目录到目标仓库的 `.agents/skills/cpp-workflow-project/`，再把下面的事实换成该工程的真实值。通用规则在插件技能 `developing-cpp` 与 `building-cpp` 里；这里只记录本项目特有的、无法从源码推断的事实。

## 工程事实

| 项 | 值 |
| --- | --- |
| 工程名 | `<project-name>` |
| 一句话职责 | `<what this program does>` |
| 源码根 | `<src-root>` |
| 库 target | `<library-target or none>` |
| 程序 target | `app` |
| 入口命令 | `<entry-command>`，例如 `bash running-build.sh clang`；Windows 原生工程需要自己提供入口脚本 |
| 构建目录 | `build/<compiler>` |
| 阶段表 | `stages/stage-table.md` |

## 环境三轴

`environment.json` 只声明三个轴，不带默认值：

| 轴 | 允许值 | 本项目 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | `<host>` |
| `build_host` | `native` / `wsl`（仅 `host=windows`） | `<build_host>` |
| `compiler` | `clang` / `gcc` | `<compiler>` |

改任何一轴都要重走 `building-cpp` 的第 5、6、7 步；不要只改构建脚本或 `.clangd`。构建前用插件的 `checking-environment.mjs` 做静态校验，跑入口命令前再做 `--live`。

## 边界

- 库负责 `<domain rules>`，不读终端、不写文件、不依赖程序层；没有独立库时写「none」，仍把可测试逻辑与终端 I/O 分开。
- 程序层负责 `<terminal input/output>`，只把流和参数传给库。
- 公开头文件位于 `<component>/include/`，程序私有头位于 `apps/include/`。
- 第三方依赖：`<none or list>`。

## 阶段表

当前阶段的可观察行为、验证方式和状态见 `stages/stage-table.md`。新增行为先加一行，再改声明与实现；不要用「重构」当阶段名。

## 本工程特有约定

只写无法从通用规则推断的内容，例如：

- 领域词：`<domain term>` 指 `<meaning>`。
- 输入格式：`<format>`。
- 外部约束：`<constraint>`。

不要把 Google 风格、CMake 规则、clang-tidy 检查清单复制进来；那些由插件技能维护，复制会分叉。也不要在这个目录里放 `developing-cpp` 或 `building-cpp` 的同名技能：项目层 rank 200 会覆盖插件正文，改一份就分叉一份。
