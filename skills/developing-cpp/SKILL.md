---
name: developing-cpp
description: 使用 C++20 编写或修改源码、头文件、命名、异常与源码注释时使用；按定行为、定边界、定声明、定实现四步推进。用于 C++ 源码本身，不用于只改文档、Python、CMake、构建脚本或与 C++ 无关的文件。
metadata:
  short-description: C++20 源码四步
---

# developing-cpp

只管 `.h` / `.cpp` 里换一台机器也不会改的内容。不写 `CMakeLists.txt`，不复制 `.clang-*`，不改构建脚本；这些归 `building-cpp`。整个流程有七步，本技能占前四步：定行为、定边界、定声明、定实现。

## 先选走法

| 走法 | 什么时候用 | 怎么做 |
| --- | --- | --- |
| 整段 | 新工程、新阶段、用户没点名范围，或改动会跨过库与程序的边界 | 按 01 → 02 → 03 → 04 走完；动工前读完本技能路由指向的文件 |
| 一处 | 用户点了一个函数、一条诊断、一个文件 | 先点名它属于哪一步，只开那一步；不顺手重排目录，不改这一处以外的可观察行为 |

拿不准先用「一处」。做到一半发现边界、公共接口或可观察行为被打破，退回「整段」，从被打破的那一步重走。

## 路由

| 改动 | 打开 |
| --- | --- |
| 头文件、源文件、命名、异常、源码注释 | 只开 `developing-cpp` |
| 类型、数值安全、容器与算法、性能、RAII/移动 | 本技能的 `references/types.md`、`standard-library.md`、`performance.md`、`language.md` |
| 领域建模、类与库的边界、何时抽共享库 | 本技能的 `references/project-design.md`，再走 02 |
| CMake、构建脚本、`.clang-format` / `.clang-tidy` / `.clangd`、编辑器推荐、换平台 | 只开 `building-cpp` |
| Python 驱动、JSON 行协议、本地 HTTP、绑定 | 只开 `python-cpp-interop` |
| 教材章节、示例、练习、任务矩阵 | 只开 `teaching-cpp` |
| 同一次改动同时越过库与程序的边界，或同时动源码和构建 | 先做完本技能的 02 定边界，再开 `building-cpp`；不要在一个技能里写另一个技能的文件 |
| 编译失败 | 诊断指向函数体或类型，回到 04；找不到头、链接失败、没有编译数据库、工具不在 PATH，留在 `building-cpp` 的 05 / 06 |

改纯文档、教材正文或与 C++ 无关的文件时，不要用本技能，即使同一个仓库里放着 C++ 工程；教材归 `teaching-cpp`，Python 编排归 `python-cpp-interop`。

## 项目技能先读

存在项目技能 `cpp-workflow-project` 时，先读它的 `SKILL.md`：工程名、库与程序的边界、阶段表、术语增补、入口命令。没有就跳过，不猜测项目约定。通用规则留在本插件，不复制进项目技能。

## 四步

| 步 | 名称 | 文件 | 一句话 |
| --- | --- | --- | --- |
| 1 | 定行为 | `steps/01-behavior.md` | 这一处要能观察到什么，先写成验收句 |
| 2 | 定边界 | `steps/02-boundary.md` | 哪些放库、哪些放程序，依赖朝哪个方向 |
| 3 | 定声明 | `steps/03-declaration.md` | 命名、声明顺序、头文件契约、声明注释 |
| 4 | 定实现 | `steps/04-implementation.md` | `.cpp` 的操作顺序、分组和实现注释 |

风格、命名、异常、注释与术语的完整条文在 `references/`；正反例在 `examples/`，只在判不准时打开。

## 参考路由

| 问题 | 打开 |
| --- | --- |
| Google 基线、九类偏离、头文件与输出 | `references/google-cpp-style.md` |
| 命名、语义角色、改名 | `references/naming.md` |
| 异常、错误返回、程序边界 | `references/exceptions.md` |
| 声明顺序、空行、头文件顺序 | `references/declaration-order.md` |
| 注释层次、Doxygen、TODO | `references/comments.md` |
| 目录、库与程序、头文件契约 | `references/layout.md` |
| 宽度、符号、枚举、强类型、`const` 成员、`[[nodiscard]]`、下标 | `references/types.md` |
| 初始化、`auto`、常量、函数、类、RAII、移动、模板 | `references/language.md` |
| 容器、迭代器、算法、`string_view` / `span`、`std::format` | `references/standard-library.md` |
| 测量、复杂度、缓存、未定义行为、sanitizer | `references/performance.md` |
| 领域值、规则核心、边界理由、共享库时机 | `references/project-design.md` |
| 中英术语与易混词 | `references/glossary.md` |

## 完成判据

- 第 1 步的行为句能被用户或测试验收；没有阶段表时，只覆盖用户点名的行为。
- 第 2 步写清了库 target 不依赖终端、GUI 或脚本；程序 target 只做装配和输入输出。
- 第 2 步的领域值有封闭类型，规则核心不依赖当前环境；共享抽象有第二个真实使用方。
- 第 3 步的公共头文件自包含，命名和声明顺序符合 `references/google-cpp-style.md` 与 `references/naming.md`。
- 第 3 步的类型宽度、符号、枚举底层类型和 `const` 成员符合 `references/types.md`。
- 第 4 步的异常只出现在合同违反或程序边界；可预期的失败用返回值表达。
- 第 4 步的资源由 RAII 管理，没有裸 `new` / `delete`；容器访问有边界证明或使用 `at`。
- 组合消息优先用 `std::format`；C++20 没有 `std::print`，输出仍走 `std::cout` / `std::cerr` 或现有流。
- 没有改 `CMakeLists.txt`、`.clang-*` 或构建脚本；没有把知识库路径、知识库 id、项目专属类名写进通用条文。
