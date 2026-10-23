# Google C++ 风格：本技能采用的版本

以 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) 为基线。除「异常政策」和「新工程默认 C++23」两处明确偏离外，排版、命名、头文件、包含顺序、类型和注释都按 Google 原文执行；本地习惯不能悄悄覆盖它。

## 语言版本

- 上游 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) 仍写 “Currently, code should target C++20, i.e., should not use C++23 features”。本工作流把**新工程默认标准**定为 C++23，并把标准放进项目声明 `environment.json` 的 `standard`（`c++11`–`c++23`）。这是项目级语言版本覆盖，不改变 Google 的排版、命名、头文件和包含顺序规则。
- `standard=c++23` 时才使用 `std::print`、`std::expected`、`std::stacktrace` 等 C++23 设施；`c++20` 及更早的项目不得使用。C++11/14/17 项目用各自可用的替代写法，不能因为本机编译器支持就偷偷升级。
- Google/LLVM 的公开基线仍集中在 C++17–C++20；默认 C++23 是本工作流的产品选择，不声称 Google 已改口。标准由项目声明和 CMake target 决定，同一仓库不要混用多个标准。
- 不使用编译器扩展；需要扩展时先停下来，改成标准写法。
- 一个工程只用一个编译器配置；不要在同一棵源码树上混用 Clang 与 GCC 的扩展。

## 头文件

- 每个头文件用 `#define` 守卫，符号由项目源码树全路径生成：`<PROJECT>_<PATH>_<FILE>_H_`，例如 `FOO_BAR_BAZ_H_`。不要用 `#pragma once`。
- 头文件必须自包含：自己用到的类型、宏、标准库头都直接包含，不依赖调用方的包含顺序。
- `.cc` 第一个包含自己的配对头，然后按下面的顺序包含。
- 包含顺序：配对头 → C 系统头 → C++ 标准库头 → 其他库头 → 本项目头。每组之间空一行，组内按字母序；不要依赖 `clang-format` 的 `IncludeCategories` 自定义分组，本项目不再覆盖 Google 预设。
- 本项目头用引号，路径从项目源码根开始，例如 `#include "base/logging.h"`。构建时把源码根加入 include 搜索路径，不要只把组件的 `include/` 设为根再写裸文件名。
- 公共头文件直接放在组件的 `include/` 下；不要为了「整齐」再加一层命名空间目录。
- 跨文件共享的常量用 `inline constexpr`，放在命名空间里并带 `k` 前缀；头文件里不要定义非 inline 的普通全局变量。
- 头文件里只放模板、`constexpr`、类内联小函数和声明；普通函数的函数体放 `.cc`。
- 头文件里不要用匿名命名空间或 `static` 隐藏定义；内部链接的实现放 `.cc`。

## 命名

| 种类 | 规则 | 例子 |
| --- | --- | --- |
| 类型、类、结构、枚举、别名、模板参数 | PascalCase | `TaskTable`, `OrderResult`, `TaskState` |
| 函数、成员函数 | PascalCase | `Contains`, `GetCurrentOrder` |
| 访问器、修改器 | Google 允许 PascalCase 或 snake_case | `Count()` / `count()`、`SetCount()` / `set_count()`；同一 API 只选一种，不要混用 |
| 变量、参数、局部变量 | snake_case | `task_count`, `current_order` |
| 类数据成员 | snake_case + 尾随 `_` | `tasks_`, `orders_` |
| 结构体数据成员 | snake_case，无尾随下划线 | `name`, `priority` |
| 常量、枚举子 | `k` + PascalCase | `kTaskCount`, `Order::kDraft` |
| 命名空间 | snake_case | `taskflow`, `warehouse` |
| 宏 | 尽量不用；必须用时全大写并带项目前缀 | `CPP_WORKFLOW_ASSERT` |

- 一个 API 不混用两套命名。对外函数用 PascalCase，成员变量用 snake_case，不要出现 `get_task` 与 `GetTask` 并存。
- 查询函数遵循同一 API 选定的访问器约定：Google 允许 `Count()` 或 `count()`，也允许 `GetCurrentOrder()`；同一 API 内不要混用两套。
- 谓词用 `Is` / `Has`：`Contains()`、`HasStock()`。返回 `bool` 但语义不是判断的函数，换成领域动词。
- 尝试用 `Try`：`TryReserve()` 返回结果类型；确定性动作直接用领域动词：`CompleteTask()`、`Reset()`。
- 映射函数的名字要含来源与目标角色：`OrderToReceipt()`、`TaskTableToString()`；禁止裸 `To()` / `Of()`。
- 计算函数用动词开头：`ScoreOrder()`、`CollectPendingTasks()`。
- `current_` 前缀只在有多个候选、且「当前」确实可能混淆时使用；只有一个当前对象时不要加。
- 避免 `Manager`、`Helper`、`Util` 这类不说明职责的后缀；名字要能回答「它负责什么」。
- 测试名用 PascalCase 描述行为，例如 `RejectsOutOfRangeTask`；测试文件用 snake_case。

## 类型与声明

- 纯数据聚合用 `struct`；有不变量的类型用 `class`，不变量在构造函数和公共成员函数里维持。
- 单参数构造函数写 `explicit`；零参数构造函数不写。
- 默认成员初始化写在声明处（NSDMI），不要在构造函数初始化列表里重复。
- 默认用花括号初始化：`int count{};`、`std::vector<int> values{1, 2, 3};`。只有需要对比、`auto` 推导或赋值语义时用 `=`；不要用 `()` 初始化普通对象。
- 类声明顺序：public → protected → private；类型与别名 → 静态常量 → 工厂 → 构造/赋值/析构 → 其他函数 → 数据成员。
- 用户声明的拷贝/移动/析构函数在头文件声明、在 `.cc` 定义；只有零参数且默认实现足够时才写 `= default`。
- 查询成员函数标尾部 `const`；返回结果对象的 API 加 `[[nodiscard]]`，不要给所有非 `void` 函数机械添加。
- 所有权优先 `std::unique_ptr`；没有共享所有权的理由时不用 `std::shared_ptr`。禁止裸 `new` / `delete`。
- 禁止 C 风格强制转换；用 `static_cast`、`const_cast`、`reinterpret_cast`、`std::bit_cast`，并让 `clang-tidy` 的 `google-readability-casting` 兜底。
- `.cc` 里不需要外部引用的定义放匿名命名空间或声明 `static`；不要在生产 `.cc` 里为了「整洁」强行用 `static`，按是否需要内部链接决定。

## 函数

- 优先返回值，不用输出参数：返回 `std::string`、`std::vector<T>`、结果结构体。
- 已有成员按 `const` 引用返回，例如 `GetHistory()`；不要返回内部容器的可变引用。
- 函数保持短小；没有硬上限，超过约 40 行时先拆出有名字的步骤，而不是加注释分节。
- 头文件里只把大约 10 行以内、确实适合内联的短函数就地定义；更长或需要完整定义的函数放 `.cc`，避免头文件膨胀和重复编译。
- 虚函数不用默认参数；默认参数只用于非虚的便利接口。
- 尾置返回类型只在普通语法不可行或明显更难读时使用，例如返回类型依赖参数；不要为了风格统一全面改写。
- 只对自己的类型重载运算符；不重载 `&&`、`||`、`,`、一元 `&`；不定义用户字面量。

## 表达式与整数

- 比较不写 Yoda 形式：`x == 0`、`task == TaskState::kPending`；不要写 `0 == x`、`nullptr == p`。
- 半开区间写成两个「变量在左」的比较：`id >= 0 && id < kTaskCount`；不要写 `0 <= id`。
- 混合优先级算术加显式括号，消除 `readability-math-missing-parentheses`。
- 内建整数默认用 `int`；需要确定宽度时用 `<cstdint>` 的 `std::int32_t`、`std::int64_t` 等（可省略 `std::` 前缀），可能到 2^31 的值用 64 位；`std::size_t` / `std::ptrdiff_t` 只用于大小和指针差。不要用无符号类型表达「这个值不会为负」。
- 封闭状态码用 `enum class`；底层类型默认 `int`，只有确实需要缩小存储时才写固定底层类型并说明理由。枚举值总是带作用域：`OrderResult::kSuccess`。
- 枚举的尾随注释要么全写要么全不写；语义结果写在最前，`///<` 对齐。
- 浮点不用 `==` 比较计算结果；按量纲给容差，金额用最小货币单位的整数。
- 数值宽度、符号、枚举、强类型、`const` 成员和下标访问的完整规则见 `references/types.md`；初始化、RAII、移动和模板见 `references/language.md`。

## 异常

Google 原文不使用 C++ 异常；本工作流只在开发阶段的源码指导中按 `references/exceptions.md` 采用 C++ Core Guidelines 的 Error handling，插件运行时不编译、不执行这套策略。其余条目仍以 Google 原文为准。

## 输出与格式化

- 组合消息以 `std::format` 为主：`std::format("任务 {} 进入状态 {}", task, state)`。
- `std::print` 只在 C++23 且标准库支持时使用，通常放在程序边界；库代码仍用 `std::format` 组合消息。C++20 及更早把格式化结果写到 `std::cout` / `std::cerr` / `std::ostringstream`。
- 简单字面量输出可以直接用 `std::cout << "..."`；需要拼接变量、对齐、数值格式时用 `std::format`。
- 列宽上限 80，每级缩进 2 个空格，代码不用 tab；这些都来自 Google 预设，不要在 `.clang-format` 里覆盖。
- 浮点输出固定精度，整数不依赖隐式格式；`std::format` 的格式串写全。

## 注释

- 注释写意图、契约、取舍，不复述代码。
- 文件头、章节横幅、声明注释、实现注释、配置注释的格式见 `references/comments.md`。
- TODO 统一写 `// TODO: <阶段或 issue> - <要做什么>`；不要写 `@todo`、`FIXME` 或只有「参考」没有动作的占位。
