# C++ 代码设计核心原则

本页是插件设计原则的维护副本，不替代技能里的条文。操作规则以 `skills/developing-cpp/references/design/session-layer.md` 与 `skills/developing-cpp/references/design/01-project-design.md` 为准；这里只保留跨项目复用的判断顺序与边界，供维护者先看全局再看细则。

## 1. 先定架构与接口，再写实现

把程序看成一次进程的生命周期：入口创建对象，对象持有状态，状态由规则回答。先写最小可运行骨架（输入 → 走一步 → 输出），再逐步加分支；每加一段，回看接口是否仍只有一个入口、是否泄漏了本层不该知道的状态。

具体做法：

- 先写会话接口（谁持有流、谁持有对局、入口函数是什么），再写入口装配。
- 再写选择接口（要一个合法着法，返回 `optional`，不拥有对局），最后写规则实现。
- 写实现时发现下层缺公开查询或撤销入口，回头补接口，不在上层复制状态；接口改动后重跑测试。
- 设计决定按「哪些决定会变」分解，不按流程图分解；一次只切一刀，把切口写成接口说明书。

## 2. 依赖只朝内

- 会话层知道规则与选择，规则与选择不知道会话；终端、JSON、HTTP 都在外围。
- 规则核心不读终端、不碰 GUI/Web/Python、不读当前时间、环境变量或工作目录。
- 选择层持有难度与随机源，向规则层要合法着法；返回时对局与调用前一致。
- 程序边界由 `main` 定义；库不定义 `main`，也不包含 `<iostream>` 或打印。

## 3. 四层边界

| 层 | 持有什么 | 不该知道 | 典型接口 |
| --- | --- | --- | --- |
| 会话 | 输入/输出/诊断流、唯一对局、唯一选择器 | 规则细节、棋盘内部 | `Run()`、开局问答、一局循环 |
| 选择 | 难度、随机引擎或搜索策略 | 终端、对局所有权 | `ChoosePosition(Game&)` 返回 `optional<Position>` |
| 规则 | 棋盘、历史、轮次、结果 | 输入输出、当前环境 | `Place`、`Undo`、`GetResult`、终局评分 |
| 构建 | 目标、依赖、RPATH | 运行时规则 | `add_library`、`add_executable`、`target_link_libraries` |

会话层不进静态库：`terminal.cpp` 只编进程序目标与终端测试，库只含规则与选择。测试目标按被测层取源文件，避免为了测试把会话塞进库。

## 4. 构建边界

- 规则库 → 程序 → 链接：`add_library` 出库，`add_executable` 出程序，`target_link_libraries(app PRIVATE library)` 连起来。
- CMake 的硬性要求只有 `target_link_libraries` 的第一个参数已创建；被链接的库可以在本次 configure 稍后出现，CMake 会自动补 ordering dependency。项目仍约定先定义后引用，这是可读性约定，不是 CMake 规范。
- 构建树与安装树的 RPATH 分开：`BUILD_RPATH` 可用 `$ORIGIN/../lib`；安装后的可执行文件由 `INSTALL_RPATH` 接管，默认空。
- 头文件自包含、每个符号由直接包含的头导出（SF.11 与 IWYU）属于编译单元边界，不是链接边界；它保证库能独立编译，不替代目标依赖规则。

## 5. 小步迭代与验证

每一轮只做一个可独立验收的改动；改完先跑项目命令，再跑定义顺序与注释检查，最后构建与运行。实现暴露的接口缺口写成下一轮的输入，而不是在本轮顺手重构相邻代码。

验证顺序：

1. 接口与行为：测试先表达可观察行为，再改实现。
2. 结构：目标、源文件、include 边界与声明顺序。
3. 措辞：命名、注释与文档；最后统一术语。

## 6. 权威位置

- 会话层、选择、规则与构建的完整说明：`skills/developing-cpp/references/design/session-layer.md`
- 领域值、结果类型、函数契约：`skills/developing-cpp/references/design/01-project-design.md`
- 文件槽位、头文件模板：`skills/developing-cpp/references/layout/`
- 命名与术语：`skills/developing-cpp/references/naming/`
- 构建目标与 RPATH：`skills/engineering/references/cmake/`

同一事实只在一处展开：本页只做索引与判断顺序，细则回到技能条文。
