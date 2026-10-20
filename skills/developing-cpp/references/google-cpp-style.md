# Google C++ 风格：本项目采用的版本

以 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) 为基线，按 C++20 工程的需要做了少量书面偏离。偏离必须写在这里，不能只存在于某个人的习惯里。

## 语言版本

- 目标标准是 C++20。不使用 C++23 的 `std::print`、`std::expected`、`std::stacktrace` 等设施。
- 不使用编译器扩展；需要扩展时先停下来，改成标准写法。
- 一个工程只用一个编译器配置；不要在同一棵源码树上混用 Clang 与 GCC 的扩展。

## 头文件

- 每个头文件用 `#pragma once`。这是对 Google「使用 `#define` 守卫」的偏离；项目统一用前者，避免守卫名漂移。
- 头文件必须自包含：自己用到的类型、宏、标准库头都直接包含，不依赖调用方的包含顺序。
- `.cpp` 第一个包含自己的配对头，然后直接包含它用到的每个标准库头；不要依赖公共头替它转包含。
- 包含顺序：相关头文件 → C 系统头 → C++ 标准库 → 其他库 → 本项目。每组之间空一行，组内按字母序；`clang-format` 的 `IncludeCategories` 负责维持。
- 本项目头文件用引号加裸文件名：`#include "inventory.h"`，路径相对于公共 include 根。不要写 `#include "component/inventory.h"`，也不要用尖括号包含项目头。
- 公共头文件直接放在组件的 `include/` 根下；不要为了「整齐」再加一层命名空间目录。
- 跨文件共享的常量用 `inline constexpr`，放在命名空间里并带 `k` 前缀；头文件里不要定义非 inline 的普通全局变量。
- 头文件里只放模板、`constexpr`、类内联小函数和声明；普通函数的函数体放 `.cpp`。

## 命名

| 种类 | 规则 | 例子 |
| --- | --- | --- |
| 类型、类、结构、枚举、别名 | PascalCase | `Inventory`, `OrderResult`, `ItemState` |
| 函数、成员函数 | PascalCase | `IsInRange`, `GetCurrentOrder` |
| 变量、参数、局部变量 | snake_case | `slot_rows`, `current_order` |
| 类数据成员 | snake_case + 尾随 `_` | `slots_`, `orders_` |
| 常量、枚举子 | `k` + PascalCase | `kSlotRows`, `Order::kDraft` |
| 命名空间 | snake_case | `inventory`, `warehouse` |
| 宏 | 尽量不用；必须用时全大写并带项目前缀 | `CPP_WORKFLOW_ASSERT` |

- 一个 API 不混用两套命名。对外函数用 PascalCase，成员变量用 snake_case，不要出现 `get_player` 与 `GetPlayer` 并存。
- 查询用 `Get` + PascalCase：`GetCurrentOrder()`、`GetHistory()`；不要用成员名直接当访问器（`current_order()`）。
- 谓词用 `Is` / `Has`：`IsInRange()`、`HasStock()`。返回 `bool` 但语义不是判断的函数，换成领域动词。
- 尝试用 `Try`：`TryReserve()` 返回结果类型；确定性动作直接用领域动词：`PlaceItem()`、`Reset()`。
- 映射函数的名字要含来源与目标角色：`OrderToReceipt()`、`InventoryToString()`；禁止裸 `To()` / `Of()`。
- 计算函数用动词开头：`ScoreOrder()`、`CollectEmptySlots()`。
- `current_` 前缀只在有多个候选、且「当前」确实可能混淆时使用；只有一个当前对象时不要加。
- 避免 `Manager`、`Helper`、`Util` 这类不说明职责的后缀；名字要能回答「它负责什么」。
- 测试名用 PascalCase 描述行为，例如 `RejectsOutOfRangeSlot`；测试文件用 snake_case。

## 类型与声明

- 纯数据聚合用 `struct`；有不变量的类型用 `class`，不变量在构造函数和公共成员函数里维持。
- 单参数构造函数写 `explicit`；零参数构造函数不写。
- 默认成员初始化写在声明处（NSDMI），不要在构造函数初始化列表里重复。容器和有默认构造的子对象不写 `{}`。
- 默认用花括号初始化：`int count{};`、`std::vector<int> values{1, 2, 3};`。只有需要对比、`auto` 推导或赋值语义时用 `=`；不要用 `()` 初始化普通对象。
- 类声明顺序：类型与别名 → 静态常量 → 工厂 → 构造/赋值/析构 → 其他函数 → 数据成员。
- 用户声明的拷贝/移动/析构函数在头文件声明、在 `.cpp` 定义；只有零参数且默认实现足够时才写 `= default`。
- 查询成员函数标尾部 `const`；返回结果对象的 API 加 `[[nodiscard]]`，不要给所有非 `void` 函数机械添加。
- 所有权优先 `std::unique_ptr`；没有共享所有权的理由时不用 `std::shared_ptr`。禁止裸 `new` / `delete`。
- 禁止 C 风格强制转换；用 `static_cast`、`const_cast`、`reinterpret_cast`、`std::bit_cast`，并让 `clang-tidy` 的 `google-readability-casting` 兜底。
- 生产代码不用匿名命名空间隐藏实现；私有实现放 `.cpp` 的 `static` 函数或独立组件，测试通过公共头使用。

## 函数

- 优先返回值，不用输出参数：返回 `std::string`、`std::vector<T>`、结果结构体。
- 已有成员按 `const` 引用返回，例如 `GetHistory()`；不要返回内部容器的可变引用。
- 函数保持短小；超过约 40 行时先拆出有名字的步骤，而不是加注释分节。
- 虚函数不用默认参数；默认参数只用于非虚的便利接口。
- 除 lambda 和必须推导的模板外，不写尾置返回类型。
- 只对自己的类型重载运算符；不重载 `&&`、`||`、`,`、一元 `&`；不定义用户字面量。

## 表达式与整数

- 比较不写 Yoda 形式：`x == 0`、`item == ItemState::kEmpty`；不要写 `0 == x`、`nullptr == p`。
- 半开区间写成两个「变量在左」的比较：`row >= 0 && row < kSlotRows`；不要写 `0 <= row`。
- 混合优先级算术加显式括号，消除 `readability-math-missing-parentheses`。
- 领域坐标、尺寸用 `std::int32_t`；容器长度和索引用 `std::size_t`。越界由边界检查函数统一判断，负值和上界都算非法。
- 封闭状态码可以用 `enum class Name : std::uint8_t`，只为缩小存储；普通枚举用默认底层类型。枚举值总是带作用域：`OrderResult::kSuccess`。
- 枚举的尾随注释要么全写要么全不写；语义结果写在最前，`///<` 对齐。
- 浮点不用 `==` 比较计算结果；按量纲给容差，金额用最小货币单位的整数。
- 数值宽度、符号、枚举、强类型、`const` 成员和下标访问的完整规则见 `references/types.md`；初始化、RAII、移动和模板见 `references/language.md`。

## 异常

Google 原文说「我们不使用 C++ 异常」。本项目按用户要求做书面偏离：**可以在合适的地方使用异常**，但只用于合同违反和程序边界，不用异常表达可预期的业务失败。完整规则见 `references/exceptions.md`。

## 输出与格式化

- 组合消息以 `std::format` 为主：`std::format("订单 {} 入库 ({}, {})", order, row, col)`。
- C++20 没有 `std::print`；格式化结果写到 `std::cout` / `std::cerr` / `std::ostringstream`。
- 简单字面量输出可以直接用 `std::cout << "..."`；需要拼接变量、对齐、数值格式时用 `std::format`。
- 列宽上限 100（`ColumnLimit: 100`），由 `clang-format` 执行；不要手工调换行。
- 浮点输出固定精度，整数不依赖隐式格式；`std::format` 的格式串写全。

## 注释

- 注释写意图、契约、取舍，不复述代码。
- 文件头、章节横幅、声明注释、实现注释、配置注释的格式见 `references/comments.md`。
- TODO 统一写 `// TODO: <阶段或 issue> - <要做什么>`；不要写 `@todo`、`FIXME` 或只有「参考」没有动作的占位。

## 对 Google 的书面偏离

| 主题 | Google | 本项目 | 理由 |
| --- | --- | --- | --- |
| 头文件守卫 | `#define` 守卫 | `#pragma once` | 统一、无守卫名漂移；主流编译器都支持 |
| 异常 | 不使用 | 合同违反/程序边界可用 | 用户明确要求「能使用异常的地方使用合理的异常」 |
| 访问器 | 可用 snake_case | `Get` + PascalCase | 与函数命名统一，调用点可搜索 |
| 列宽 | 80 | 100 | 现代屏幕与 C++ 模板可读性；团队统一 |
| 项目头包含 | 相对源根 | 公共 include 根 + 裸文件名 | 公共头直接放 `include/`，减少路径噪音 |
| 源文件扩展名 | `.cc` | `.h` / `.cpp` | 现有工程、编辑器和教学材料统一用 `.cpp` |
| 风格检查器 | `cpplint.py` | `clang-format` + `clang-tidy` | 与编译数据库集成，可自动修复；不再维护 Python 检查器 |
| 枚举底层类型 | 默认 | 封闭状态码可 `: std::uint8_t` | 缩小存储，边界明确 |
| 整数宽度 | `int` / 实现定义宽度 | 领域坐标 `std::int32_t`，容器下标 `std::size_t`，状态码 `std::uint8_t` | 协议、布局和负坐标需要可预测宽度 |

偏离之外仍以 Google 原文为准；新增偏离必须先写进本表，再改配置或代码。
