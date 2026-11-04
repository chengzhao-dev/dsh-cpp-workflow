---
name: cpp-workflow-project
description: 当前 C++ 工程的本地事实与通用工作流约定：工程与组件名、库和程序的边界、入口命令、阶段表、术语增补。开始任何 C++ 任务前先读；工程特有的值写在这里，通用条文由插件三个技能维护。
metadata:
  short-description: 当前 C++ 工程事实与通用约定
---

# cpp-workflow-project

这是项目模板，不是插件；复制整个目录到目标仓库的 `.agents/skills/` 下，目录名保持 `cpp-workflow-project`，再把下面的空位换成该工程的真实值。目标已有同名文件时只补缺失文件，不覆盖源码、`CMakeLists.txt` 或 `.clang-*`。一个仓库只保留一份 `environment.json`。

本文件只写工程自己的值与偏离；通用源码、CMake、构建、编辑器和检查条文由三个插件技能维护。不要在项目技能里复制三份技能的正文。

## 工程与组件

| 项 | 值 |
| --- | --- |
| 工程名 | `<project-name>` |
| 一句话职责 | `<程序用一句话说明做什么>` |
| 组件名 | `<component-name>` |
| 源码根 | `<src-root>` |

同目录的 `environment.json` 三个环境轴必须填本工程的真实组合；`standard` 默认 `c++23`，可改成 `c++11`–`c++23`。环境轴留空时技能仍可能出现，但定构建会停。

## 库与程序的边界

- 库负责：`<领域规则；没有单独库时写“无”>`
- 程序负责：`<终端输入输出与装配>`
- 公共头位置：`<component>/include/`
- 依赖方向：`<程序依赖库；库不依赖终端、GUI 或脚本>`

## 通用工作流约定

以下约定不随工程变化；与本工程的真实情况冲突时，在项目技能里写一行偏离和理由。

- 环境以 `environment.json` 为唯一来源；新工程默认 C++23，不猜轴、不猜编译器。
- `.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/` 随工程存放，不继承仓库根或用户主目录。
- 库与程序分开 target；程序链接库，终端输入输出留在程序。
- CTest 在工程内注册并运行；仓库根不构建、不注册测试。
- 头文件用路径式包含守卫，不用 `#pragma once`。
- 命名按 Google C++ 风格与工程白名单执行；谓词用 `Is/Has/Can/Completes` 等肯定式。
- 标准与警告由 `cmake/CompileSettings.cmake` 的 `CompileSettings_SetCxxStandard`、`CompileSettings_SetWarnings` 统一施加；`environment.json` 的 `standard` 与 `.clang-format` 同步。
- 每个可独立构建、运行的程序一个工程；共享库等第二个真实使用方出现、语义稳定后再抽。
- 阶段表、代码目录与文档章节保持对齐；没有阶段表时只写用户点名的行为。

## 入口命令

```text
<entry-command>
```

从仓库根可直接运行；它串起配置、构建、测试和最小运行，format 与 tidy 不在这里跑。

## 阶段表

- 路径：`stages/stage-table.md`
- 一个阶段一行，只写可观察行为；没有可观察行为的不进表。

## 术语增补

- `<domain term>`：`<meaning>`

## 编辑器补全

- clangd 提供补全、跳转和诊断；`.clangd` 指向 `build/<compiler>` 的编译数据库，不写 `-std`。
- `--query-driver` 放在 `.vscode/settings.json` 的 `clangd.arguments`，不要写成 `.clangd` 的 YAML 键。
- CMake Tools 是唯一的配置、构建、运行和调试入口；C/C++ 扩展只做 `CMake: Debug` 的后端，IntelliSense 关闭。

## 完成判据

- [ ] 入口命令从仓库根通过，构建无新警告。
- [ ] CTest 全绿；测试条数与阶段表或工程声明一致。
- [ ] `clang-format --dry-run --Werror` 与 `clang-tidy` 无新告警。
- [ ] 阶段表、代码目录与文档章节的实际状态一致。
- [ ] 有文档检查时，项目声明的检查命令通过；跨域改动也跑同一条。

## 可选约定

- 两个具体工程之前不抽共享库；领域术语、平台差异和本工程的偏离写在这里。
