<!-- 读取时机：查格式与写法时；读完能回答：Google C++ 风格：本技能采用的版本；预算：一次只开这一份（83 行），不自动串联。 -->
# Google C++ 风格：本技能采用的版本

以 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) 为基线。除「异常政策」「新工程默认 C++23」「枚举底层类型 `std::uint8_t`」「注释格式」「头文件去重方式」和「排版（4 空格、120 列、`IncludeBlocks: Preserve`）」六处明确偏离外，排版、命名、头文件、包含顺序和类型都按 Google 原文执行；普通对象默认花括号属于 Google 允许的本地选择，不单列为偏离；本地习惯不能悄悄覆盖它。

## 语言版本

- 上游 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) 仍写 “Currently, code should target C++20, i.e., should not use C++23 features”。本工作流把**新工程默认标准**定为 C++23，并把标准放进项目声明 `environment.json` 的 `standard`（`c++11`–`c++23`）。这是项目级语言版本覆盖，不改变 Google 的排版、命名、头文件和包含顺序规则。
- `standard=c++23` 时才使用 `std::print`、`std::expected`、`std::stacktrace` 等 C++23 设施；`c++20` 及更早的项目不得使用。C++11/14/17 项目用各自可用的替代写法，不能因为本机编译器支持就偷偷升级。
- Google/LLVM 的公开基线仍集中在 C++17–C++20；默认 C++23 是本工作流的产品选择，不声称 Google 已改口。标准由项目声明和 CMake target 决定，同一仓库不要混用多个标准。
- 不使用编译器扩展；需要扩展时先停下来，改成标准写法。
- 一个工程只用一个编译器配置；不要在同一棵源码树上混用 Clang 与 GCC 的扩展。

## 头文件

- 每个头文件用一行 `#pragma once` 去重，写在文件头之后、第一组 `#include` 之前；不写 `#ifndef` / `#define` 宏守卫。Google 要求路径式守卫，本工作流明确偏离，原因是宏名要把项目名、目录名和文件名拼在一起，组件改名或头文件跨工程复用时宏名会失效，而 `#pragma once` 按文件身份判断；GCC、Clang、MSVC 都支持。模板见 `references/layout/02-file-template.md`。
- 头文件必须自包含：自己用到的类型、宏、标准库头都直接包含，不依赖调用方的包含顺序；自检方式见 `references/layout/02-file-template.md`。「头文件里不放什么」同见该文件的禁项，不在这里另列一份。
- `.cpp` 第一个包含自己的配对头，然后按下面的顺序包含。
- 包含顺序：配对头 → C 系统头 → C++ 标准库头 → 其他库头 → 本项目头。每组之间空一行，组内按字母序。clang-format 的 Google 预设自带 `IncludeCategories`（`^<.*\.h>` 第一组、其余尖括号头第二组、引号头最后）并开了 `IncludeBlocks: Regroup`，配置里不写 `SortIncludes: false` 时这份分组与排序会自动落实。模板资产把 `IncludeBlocks` 设为 `Preserve`，保留手写空行分组，组内仍按上述类别排序。clang-format 按 `IncludeIsMainRegex` 从文件名推断配对头（`board_test.cpp` 配 `board.h`）；文件名不遵循 `<name>` 或 `<name>_test` 时要自己把配对头放在第一条。`#include` 之间夹独立注释或 `#if` 会切断分组，这类位置要自己保持次序。需要把第三方库单独成组（例如 `<gtest/gtest.h>` 与标准库之间空一行）时，才在工程 `.clang-format` 里追加优先于 `^<.*` 的类别，并说明理由；预设已覆盖的分组不要重复手写。`clang-tidy` 的 `llvm-include-order` 按 LLVM 分组，与这条不同，不要拿来替代 clang-format。
- 本项目头用引号写裸文件名，例如 `#include "logging.h"`。构建时把该组件的 `include/` 加入 include 搜索路径（`target_include_directories(<target> PUBLIC .../include)`），不要写 `"base/logging.h"` 这种从源码根起的长路径。
- 公共头文件直接放在组件的 `include/` 下；不要为了「整齐」再加一层命名空间目录。
- 跨文件共享的常量用 `inline constexpr`，放在命名空间里并带 `k` 前缀；不写非 inline 的普通全局变量定义（头文件禁项见 `references/layout/02-file-template.md`）。
- 头文件与实现文件的槽位见 `references/layout/02-file-template.md`。
- 头文件禁项的完整清单以 `references/layout/02-file-template.md` 为准；内部链接的实现放 `.cpp`。

## 命名

大小写、前缀、成员尾随 `_`、常量与枚举子的 `k` 前缀、命名空间与文件名的完整规则表，以及访问器、谓词、`Try`、映射函数、`current_` 前缀的语义角色，见 `references/naming/01-identifier-names.md`。本文只保留两处 Google 原文允许选择、而本项目需要统一的点：

- 访问器、修改器 Google 允许 PascalCase 或 snake_case；本项目统一 PascalCase，同一 API 不混用两套。
- 测试名用 PascalCase 描述行为，例如 `RejectsOutOfRangeTask`；测试文件用 snake_case。
- 测试套件用被测类型加 `Test`，例如 `OrderBookTest`；suite 与用例两段都必须是合法 C++ 标识符，不能含下划线。
- 一个 `TEST` 只锁一个可观察行为；词数不设硬上限，以读得懂为准。

## 类型与声明

- 聚合与不变量的选型见 `references/language/language-basics/07-classes.md`；单参数 `explicit` 与零参数的例外见 `references/language/language-basics/06-functions.md`。
- 默认成员初始化、花括号初始化与拷贝初始化的选择见 `references/language/language-basics/02-initialization.md`。
- 类内声明顺序见 `references/layout/03-declaration-order.md`；特殊成员 `= default` / `= delete` 的位置见 `references/layout/02-file-template.md`。
- 查询成员的尾部 `const` 与结果对象的 `[[nodiscard]]` 见 `references/language/value-types/06-const-method.md`、`07-nodiscard.md`。
- 所有权与裸 `new` / `delete` 见 `references/language/language-basics/08-raii.md`；四种 `*_cast` 与禁止 C 风格转换见 `references/language/value-types/02-signed.md`。
- `.cpp` 里不需要外部引用的 `constexpr` 直接放具名命名空间；仅一个函数使用时才用函数内 `static constexpr`；函数和类型仍放匿名命名空间。
- 一个 `.cpp` 只写一个匿名命名空间，公开函数的定义放在它后面。
- 只给本翻译单元用的函数和类型放唯一的匿名命名空间，不用文件作用域 `static` 隐藏函数：LLVM 与 Mozilla 的规范偏好 `static`，Chromium、C++ Core Guidelines SF.22、MISRA C++:2023 6.5.2 与 Abseil Tip 186 用匿名命名空间，本工作流跟后面这一组。
- 类的 `static` 成员函数没有内部链接，不能用来隐藏实现；函数内 `static` 对象只表示静态存储期，不表示内部链接。
- 另一个 `.cpp` 要调用的函数放在匿名命名空间外，并在配对头文件声明；不要为了两个函数再套 `detail` 或 `testing` 命名空间。
- 常量要出 `.cpp` 时按四步升：1) 其他翻译单元要的是算出来的答案，给类加查询、表留 `.cpp`；2) 要同一份坐标但仍不是公开契约，放组件 `src/` 的私有头；3) 对方必须写 `Board::kLines` 且这是类型的稳定事实，才用类内 `public static constexpr`；不依赖某个对象的公开常量则用命名空间 `inline constexpr`；4) 第二使用方复用同一套坐标时再抽共享组件。

## 函数

- 返回值与输出参数、`const` 引用返回、虚函数默认参数见 `references/language/language-basics/06-functions.md`；`if` / `for` / `while` 的花括号见 `05-expressions.md`。
- 函数保持短小；没有硬上限，超过约 40 行时先拆出有名字的步骤，而不是加注释分节。
- 头文件与实现文件的槽位见 `references/layout/02-file-template.md`，不在条文里重复内联阈值。
- 虚函数不用默认参数；默认参数只用于非虚的便利接口。
- 尾置返回类型只在普通语法不可行或明显更难读时使用，例如返回类型依赖参数；不要为了风格统一全面改写。
- 只对自己的类型重载运算符；不重载 `&&`、`||`、`,`、一元 `&`；不定义用户字面量。

## 表达式与整数

- 比较不写 Yoda 形式：`x == 0`、`task == TaskState::kPending`；不要写 `0 == x`、`nullptr == p`。
- 半开区间写成两个「变量在左」的比较：`id >= 0 && id < kTaskCount`；不要写 `0 <= id`。
- 混合优先级算术加显式括号，让读代码的人不必先还原优先级；默认 Checks 不含 `readability-math-missing-parentheses`，这条靠评审。
- 内建整数默认用 `int`；需要确定宽度时用 `<cstdint>` 的 `std::int32_t`、`std::int64_t` 等（可省略 `std::` 前缀），可能到 2^31 的值用 64 位；`std::size_t` / `std::ptrdiff_t` 只用于大小和指针差。不要用无符号类型表达「这个值不会为负」。
- 封闭状态码用 `enum class`；本项目默认写 `: std::uint8_t`（见 `references/language/value-types/04-enum.md`，有意偏离 Google 的默认 `int`），确需其他 ABI 宽度时写明理由，普通枚举用默认底层类型。枚举值只在必要时显式指定；默认的连续值有利于 `switch` 的实现，也能避免因手写数值而出错（C++ Core Guidelines Enum.8）。枚举值总是带作用域：`OrderResult::kSuccess`。
- 枚举的尾随注释要么全写要么全不写；两种句式与禁止项见 `references/comments/01-comment-rules.md`「枚举项与 `struct` 短字段：两种句式」。
- 浮点不用 `==` 比较计算结果；按量纲给容差，金额用最小货币单位的整数。
- 数值宽度、符号、整数角色、枚举、强类型、`const` 成员和下标访问的完整规则见 `references/language/value-types/01-width.md`、`02-signed.md`、`03-integer-roles.md`、`04-enum.md`、`05-strong-type.md`、`06-const-method.md`、`09-subscript.md`；初始化、RAII、移动和模板见 `references/language/language-basics/`。

## 异常

Google 原文不使用 C++ 异常；本工作流只在开发阶段的源码指导中按 `references/exceptions/01-exception-rules.md` 采用 C++ Core Guidelines 的 Error handling，插件运行时不编译、不执行这套策略。其余条目仍以 Google 原文为准。

异常消息的组织方式见 `references/exceptions/01-exception-rules.md` 的「消息」节。

## 输出与格式化

- `std::format` 与流的组合消息、简单字面量输出、浮点与整数格式见 `references/language/standard-library/06-format.md`。
- 列宽跟文件最近的 `.clang-format` 的 `ColumnLimit` 走（从文件目录向上查到工程根）；工程未声明时按 120 列，模板资产固定 `ColumnLimit: 120`。每级缩进用 4 个空格，续行与行内对齐也用空格；缩进与对齐由 `.clang-format` 统一，不在条文里另定一套。

## 注释

- 注释写意图、契约、取舍，不复述代码；写什么见 `references/comments/01-comment-rules.md`，怎么写见 `02-style.md`。
- 注释格式是本项目的第四处偏离：用 Doxygen 的 `///` 加 `@file`、`@brief`、`@param` 组织，Google 原文用 `//` 散文、文件头放 license boilerplate；本项目源码不带 license 头，分发或开源前补上。
- TODO 句式见 `references/comments/02-style.md` 的「TODO」条；不要写 `@todo`、`FIXME` 或只有「参考」没有动作的占位。
