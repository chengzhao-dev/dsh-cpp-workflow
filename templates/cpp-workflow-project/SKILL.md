---
name: cpp-workflow-project
description: 当前 C++ 工程的本地事实：工程与组件名、库和程序的边界、入口命令、阶段表、术语增补。开始任何 C++ 任务前先读；这里只写本工程特有的、无法从源码推断的内容。
metadata:
  short-description: 当前 C++ 工程事实
---

# cpp-workflow-project

这是项目模板，不是插件；复制整个目录到目标仓库的 `.agents/skills/` 下，目录名保持 `cpp-workflow-project`，再把下面的空位换成该工程的真实值。目标已有同名文件时只补缺失文件，不覆盖源码、`CMakeLists.txt` 或 `.clang-*`。一个仓库只保留一份 `environment.json`。

## 工程与组件

| 项 | 值 |
| --- | --- |
| 工程名 | `<project-name>` |
| 一句话职责 | `<程序用一句话说明做什么>` |
| 组件名 | `<component-name>` |
| 源码根 | `<src-root>` |

同目录的 `environment.json` 三个轴必须填本工程的真实组合；留空时技能仍可能出现，但定构建会停。

## 库与程序的边界

- 库负责：`<领域规则；没有单独库时写“无”>`
- 程序负责：`<终端输入输出与装配>`
- 公共头位置：`<component>/include/`
- 依赖方向：`<程序依赖库；库不依赖终端、GUI 或脚本>`

## 入口命令

```text
<entry-command>
```

从仓库根可直接运行；构建、格式化、静态检查、测试和运行都由它串起来。

## 阶段表

- 路径：`stages/stage-table.md`
- 一个阶段一行，只写可观察行为；没有可观察行为的不进表。

## 术语增补

- `<domain term>`：`<meaning>`

## 可选约定

- 两个具体工程之前不抽共享库。
