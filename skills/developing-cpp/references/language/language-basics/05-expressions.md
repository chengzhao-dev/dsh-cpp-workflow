# 表达式与比较

- 比较写成“变量在左、常量在右”：`if (id < kTaskCount)`，不写 Yoda 条件 `if (kTaskCount > id)`；常量与枚举值总在右边。成员与参数比较时，成员状态在左、参数在右，如 `if (current_player_ != move.player)`：判断「轮到谁」以对象自己的状态为起点，参数是被核对的一次输入；成员与常量比较时成员在左，如 `if (value_ != SquareValue::kEmpty)`；参数与常量比较时参数在左。分不清主次时按“读起来的主语”决定，同一段代码保持同一种顺序。
- 同一个值对多个离散取值分派时用 `switch`，不用一串 `if`：值来自枚举或整数常量、分支 3 个以上、分支体短。枚举覆盖全部取值时不写 `default`，新增取值由 `-Wswitch` 指出；编译器需要出口时在 `switch` 后写 `std::unreachable()`（C++23 起；低标准写 `assert(false)` 或 `std::abort()`），不写 `throw` 兜底。
- 条件是比较范围、布尔组合，或只有 1–2 个分支时用 `if`；一个函数里有多条拒绝分支时，每条各写一条独立 `if` 并提前返回，成功路径留在函数末尾，不串 `else if`，也不用 `else` 包住。
- 否定按「类型有什么谓词」决定，不按个人习惯：类型提供 `IsEmpty()`、`IsFull()` 这类肯定式查询时，条件直接从肯定式写起，如 `if (square.IsEmpty())`。被拒绝的情形没有对应谓词时才用 `!`，如占用检查只能写成 `if (!square.IsEmpty())`；这种 `!` 只套一层，不写 `!!`，也不把 `!(value != SquareValue::kEmpty)` 这类双重否定留给读者。枚举比较同样先写正向判断：判空写 `value == SquareValue::kEmpty`，判非空写 `value != SquareValue::kEmpty`。
- 同一类值有 3 个以上时用数组加下标，不写 `value0`、`value1`、`value2`：`std::array<SquareValue, 3> values{};` 配合 `values[i]`；成组的常量数据写成 `std::array<Line, 8> kLines` 再由循环消费。只有 1–2 个语义各自独立的值才各起名字。
- 不依赖隐式穿透；确实需要穿透时写 `[[fallthrough]]`。
- 混合优先级的算术表达式加括号：`(a + b) * c`，不依赖读者记忆优先级。`readability-math-missing-parentheses` 会检查。
- 区间用半开区间 `[low, high)`；判空用 `empty()`，不要用 `size() == 0`。
- 逻辑表达式按语义分组，一组一个括号；组内的单个比较不再加括号，`&&` 的优先级已经清楚，多加一层反而难核对。
- 整行在列宽内时写一行；放不下时按组换行，各组对齐。不要把多个否定串成一行。
- 自增自减单独成句；不要在同一个表达式里对同一对象多次修改，那是未定义行为。

## 依据

- [ISO C++ `[expr]`](https://eel.is/c++draft/expr)：运算符优先级、求值顺序与未定义行为。
- [cppreference: Expressions](https://en.cppreference.com/w/cpp/language/expressions)：运算符分类、短路与序列点规则。
- [C++ Core Guidelines: ES.41](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-expr)：避免容易误读的表达式，必要时加括号。
- [Style Guide for Writing Comparisons in Conditions](https://www.enyo.de/fw/notes/style-guide-conditions.html)：变化最快、最不确定的一方写在比较左边；常量前置已无必要，且常掩盖本意。
- [提议中的 clang-tidy 检查 `readability-constant-operand-order`](https://github.com/llvm/llvm-project/pull/167158)：仍为 open 的 PR #167158，尚未合入；其方向是现代代码库统一写 `x == 0`，不写 `0 == x`。
- [LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html) 与 [Linux kernel coding style](https://www.kernel.org/doc/html/latest/process/coding-style.html)：示例都用自然语序（`I != E`、`system_state == SYSTEM_RUNNING`），不把常量前置。
- [C++ Core Guidelines: ES.70、ES.78、ES.79](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-expr)：有选择时优先 `switch`；对常量比较，通常比 `if`-`then`-`else` 链更容易优化，并能提示枚举是否覆盖全；不依赖隐式穿透，`default` 只处理常见情况。
- [LLVM Coding Standards: Don't use default labels in fully covered switches over enumerations](https://llvm.org/docs/CodingStandards.html#don-t-use-default-labels-in-fully-covered-switches-over-enumerations)：全覆盖枚举 `switch` 不写 `default`；需要给编译器出口时在 `switch` 后用 `llvm_unreachable`（对应本项目的 `std::unreachable`）。
- [Google C++ Style Guide: switch statements](https://google.github.io/styleguide/cppguide.html#switch-statements)：非枚举条件的 `switch` 必须有 `default`；枚举由编译器提醒未覆盖值；`[[fallthrough]]` 必须标注。
- 关于多分支与提前返回：[LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html) 要求 `return`、`break`、`continue`、`goto` 之后不写 `else`，[C++ Core Guidelines F.56](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#f-nesting) 把 `return` 之后的 `else` 列为冗余，[clang-tidy `readability-else-after-return`](https://clang.llvm.org/extra/clang-tidy/checks/readability/else-after-return.html) 直接检查 `return`、`break`、`continue`、`throw` 之后的 `else`。本工作流按这个方向写：每条拒绝各写一条独立 `if` 并提前返回，成功路径留在末尾；不同拒绝原因之间没有先后依赖，不串 `else if`。
- 肯定/否定谓词：[Microsoft Framework Design Guidelines: Names of Type Members](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/names-of-type-members) 要求布尔成员用肯定短语（`CanSeek`，不用 `CantSeek`），可加 `Is`、`Can`、`Has`。C++ Core Guidelines、LLVM 与 Google 都没有规定条件的极性，所以「默认肯定式」在本工作流属于项目约定，Microsoft 的条文只作跨语言旁证。
- 3 个以上同类值用数组加下标：没有一手规范规定这一点，属于本工作流的项目约定；理由是同一段循环只写一次，新增一项不必再起一个名字。
