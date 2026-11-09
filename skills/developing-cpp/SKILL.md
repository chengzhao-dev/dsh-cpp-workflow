---
name: developing-cpp
description: 编写或修改 C++11–C++23 源码、头文件、命名、异常与源码注释时使用，新工程默认 C++23；编译错误、未定义行为、注释改写、类型或函数重新设计都从这里进。一次改动同时碰到源码和构建文件时先打开本技能。不用于只改文档、Python、CMake、构建脚本或与 C++ 无关的文件。
metadata:
  short-description: C++11–C++23 源码四步
---

# developing-cpp

本技能处理换一台机器也不会改的源码内容：可观察行为、库与程序的边界、声明、命名、异常与源码注释。文件槽位以 `references/layout/02-file-template.md` 为准，排版以 `references/style/01-google-cpp-style.md` 的 Google 基线为准，命名以 `references/naming/01-identifier-names.md` 为准。加载顺序与层表见 [budget.md](../shared/budget.md)。

## 适用场景

- **负责**：类型、函数与文件的行为和契约；声明与实现；命名；异常；源码注释。
- **不负责**：`CMakeLists.txt` 与 `cmake/` 开 `engineering`；`running-build.sh`、`.clang-*`、`.vscode/`、`environment.json` 开 `building-cpp`，本技能只读其中的 `standard`；`.qmd`、仓库 README、Python 与其他文档不打开本技能。
- **交接**：一次改动跨域时按「源码 → engineering → building-cpp」逐段进入，前一段结论落下再开下一段。只改函数体、命名、异常或注释且入口命令可运行时，第 4 步后只开 `building-cpp` 的通过检查；新增或移动源文件、改库与程序的边界、补测试 target 时，完成前必须开 `engineering` 把文件写进 CMake。
- **前置**：存在项目技能 `cpp-workflow-project` 时先读它的 `SKILL.md`：工程名、库与程序的边界、阶段表、术语增补、入口命令与语言档位。项目技能没写档位才读 `environment.json` 的 `standard`，两者都没有时才用新工程默认 C++23；声明 C++20 的工程里不写 C++23 才有的设施。没有项目技能时门禁不会放出本技能，不猜项目约定。
- **编码**：源码与构建文件的编码以 `../engineering/references/formatting/01-encoding.md` 为准；行尾与 `.clang-format` 的 `LineEnding` 跟仓库根 `.gitattributes` 与 `.editorconfig`。

## 三种操作

一次只选一种，范围（单点、整段）是任务属性；判据、边界与交接见共用入口 [operations.md](../shared/operations.md)。四类改动是域，不是操作。

| 操作 | 什么时候用 | 从哪步进 |
| --- | --- | --- |
| 写作（起稿） | 新增类型、函数或文件；改可观察行为；改库与程序的边界；补构造后置条件与成员事实 | 第 1 步；新工程走到第 4 步 |
| 改写 | 行为与契约不变，文件位置、声明顺序或函数体组织不对 | 从被打破的步重走，可到第 4 步 |
| 润色 | 只改命名或注释措辞 | 第 3 步 |

- 不发明阶段表和用户请求里没有的行为、类型与命令；选类型与写法时以项目声明的语言标准为上限。
- 只改注释或格式时不改可观察行为；不覆盖已有源码；不安装工具链；代理侧不写 `wsl` 或 `bash -lc`。
- 计划、命名方案或注释措辞与条文、项目技能或用户明确要求冲突时，先列冲突位置、原文与出处，由用户选一条；不自行取舍，也不默认采用计划。
- 后一步发现前一步没做完，退回那一步，不在当前步补结构；拿不准先用单点修正，边界被打破则退回整段重构。

## 步骤

| 步 | 名称 | 文件 | 一句话 |
| --- | --- | --- | --- |
| 1 | 定行为 | `steps/01-behavior.md` | 把这一处要能观察到的结果写成验收句 |
| 2 | 定边界 | `steps/02-boundary.md` | 决定哪些放库、哪些放程序，依赖朝哪个方向 |
| 3 | 定声明 | `steps/03-declaration.md` | 写命名、声明顺序、头文件契约和声明注释 |
| 4 | 定实现 | `steps/04-implementation.md` | 写 `.cpp` 函数体的操作顺序、分组和实现注释 |

每步只打开同号的一个步骤文件；步骤里的 `references/…` 是出处和排错入口，不是必读清单；只有判不准、规则冲突，或该步明说「打开」某一份时才打开它。

## 入口表

先按「改哪一类东西」选一行，再打开那一行点名的一份；同一步骤里的细节留到真正需要时再开。

| 改什么 | 从哪一份进 |
| --- | --- |
| 不知道开哪一份条文 | `references/index.md` |
| 行为、库与程序的边界 | `steps/01-behavior.md`、`steps/02-boundary.md`；案例在 `references/design/examples/` |
| 会话层、选着与程序边界 | `references/design/session-layer.md`；领域规则见 `references/design/01-project-design.md` |
| 文件槽位、包含守卫、声明顺序 | `references/layout/02-file-template.md`、`references/layout/03-declaration-order.md` |
| 命名与改名 | `references/naming/01-identifier-names.md`；案例在 `references/naming/examples/`；术语在 `references/naming/glossary/` |
| 声明注释与实现注释 | `references/comments/01-comment-rules.md`（写什么）与 `references/comments/02-style.md`（结构、版式、措辞）；案例在 `references/comments/examples/` |
| 异常规则与异常案例 | `references/exceptions/01-exception-rules.md`；案例在 `references/exceptions/examples/` |
| 结果类型与值类型 | `references/language/value-types/`：宽度、符号、整数角色、枚举、强类型、const 成员、`[[nodiscard]]`、比较、下标、float/bool |
| 语言基础 | `references/language/language-basics/`：对象、初始化、推导、const、表达式、函数、类、RAII、模板 |
| 标准库 | `references/language/standard-library/`：容器、访问、迭代、算法、string、format、time、random、files |
| 性能与陷阱 | `references/language/performance/`：测量、复杂度、内存、未定义行为、陷阱、伪优化 |
| 操作判不准、规则冲突 | `../shared/operations.md`、`../shared/rule-priority.md` |

进入 `references/` 前先读 `references/index.md`，再按主题或语义选一份；数字前缀只表示同一主题内的阅读顺序，不是案例编号；每类末尾的完成清单在该类改完后读。

## 加载预算

加载预算见 [budget.md](../shared/budget.md)。

项目技能列出了检查命令时先跑它；无论有没有项目命令，都再跑本技能的 `scripts/checking-declaration-order.mjs`（定义顺序）与 `scripts/checking-comments.mjs`（注释）；两者退出码为 0 后停在这一步，不再继续走没有失败的步骤。

## 四类改动

四类改动是操作内部的域：操作定入口，域定层次。四域的定义、边界与次序见 [operations.md](../shared/operations.md)；一次改动混了两类时，按「内容 → 结构 → 版式 → 措辞」拆开做，前一类落定并经检查再进下一类。

| 类型 | 典型请求 | 入口步骤 |
| --- | --- | --- |
| 内容 | 新增类型、函数或文件；改可观察行为；改库与程序的边界；补构造后置条件与成员事实 | `steps/01-behavior.md` |
| 结构 | 换文件位置、拆头文件、调声明顺序、补测试 target；改注释位置与行尾形态 | `steps/03-declaration.md` |
| 版式 | 只改缩进、行宽、包含顺序或注释符号 | `steps/03-declaration.md` |
| 措辞 | 只改命名、只改注释措辞 | `steps/03-declaration.md` |

只改格式时不动行为，只改注释时不动签名；条文由入口步骤按需打开。同一处命中多条规则时，按 `../shared/rule-priority.md` 的五级次序判：行为与契约 > 结构 > 清晰 > 一致 > 形式；高层未解决，不先做低层润色。

## 完成判据

- [ ] 第 1 步的行为句能被用户或测试验收；有阶段表时只覆盖对应行，没有时只覆盖用户点名的行为。
- [ ] 第 2 步的库 target 不依赖终端、GUI 或脚本；程序 target 只做装配和输入输出；共享抽象有第二个真实使用方。
- [ ] 第 3 步的公共头文件自包含，命名、声明顺序和异常声明符合 `references/` 的条文；类型注释只写本类型，纯值容器一句，初始状态归默认构造函数。
- [ ] 第 4 步的实现只兑现声明；`.cpp` 定义顺序与头文件声明同序；同一文件里的函数按同一套分段约定，需要分阶段的都有阶段注释与空行；资源由 RAII 管理；失败是正常结果时用返回值，函数无法完成任务时抛异常，不拿异常做正常分支。
- [ ] `.cpp` 定义顺序检查通过：`node "<skill-dir>/scripts/checking-declaration-order.mjs" --root <项目根>` 退出码为 0；有乱序先修，不能跳过。
- [ ] 源码注释符合 `references/comments/01-comment-rules.md` 与 `02-style.md` 的规范，`node "<skill-dir>/scripts/checking-comments.mjs" --root <项目根>` 退出码为 0，末行是「注释检查通过：N 个文件。」。
- [ ] 没有改 `CMakeLists.txt`、`.clang-*`、构建脚本，也没有把外部资料路径或项目专属类名写进通用条文。
