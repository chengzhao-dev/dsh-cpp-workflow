# 第 4 步：定实现

## 产出

`.cpp` 实现文件中的函数体、操作顺序、分组空白和实现注释。实现只兑现第 1 步的行为和第 3 步的声明；需要新增公共接口时回到第 3 步。

## 通用情况

- 函数保持短小，一个函数只做一件事。超过约 40 行时先找可以命名的中间步骤，不靠注释把长函数切成几段。
- 按「准备 → 操作 → 收尾」排列语句，用空行分组；组与组之间的空行表达阶段，同一组内的守卫与结果处理不插空行。
- `.cpp` 里的定义顺序跟配对头文件：先类型与常量，再自由函数，再成员函数；成员函数按类内声明顺序。头文件把构造函数、析构函数、拷贝/移动声明在成员组最前时，定义也放最前；如果头文件把它们声明在别的成员之后，仍按头文件顺序，不硬提。不为先编译重排，也不按调用频率重排。`.cpp` 里不需要外部引用的 `constexpr` 放具名命名空间，仅一个函数使用时才用函数内 `static constexpr`；函数与类型放唯一的匿名命名空间，公开函数定义放在其后。见 `references/layout/03-declaration-order.md`「`.cpp` 的定义顺序」与 `references/style/google-cpp-style.md`。
- 同一文件里的函数按同一套分段约定：需要分阶段的非单表达式函数按空行分段、每段上方一句；读入、单值转换、一行输出这类一条直路的短函数不加分段注释；不能结构相近的函数一半分段、一半完全不留注释。阶段怎么分见 `references/layout/03-declaration-order.md`「函数体内的空行」。
- `.cpp` 的第一个 include 是自己的配对头，然后直接包含本文件用到的标准库头，不依赖公共头转发声明。包含顺序见 `references/style/google-cpp-style.md`，文件槽位见 `references/layout/02-file-template.md`。
- 函数体注释用 `//`，不用 `///`：体内 `///` 会接到该函数的 Doxygen 详细说明后面。重要函数按空行分阶段，每个阶段上方写一句 `//`，写这一支在检查什么，可以点明处理了哪些枚举值，不逐词翻译下一行的条件；`//` 里的枚举值不加反引号。单表达式函数（如 `IsEmpty`）不配注释；关键局部表（查表、分派表）上方写一句，说明表的角色与分组。只写删掉会让下一次修改得到错误结果、而代码本身看不出的内容；变更史留给提交说明。`.cpp` 的自由函数在定义上一行用 `///` 写一句职责，与配对头文件的声明注释一致；类方法定义不重复声明处已有的事实。
- 什么时候在 `if` 上方加一句：多条独立拒绝（如 `Game::Place`）每个 `if` 一句，不同条件的 `if` 不合并成一句；成功写入前一句；只有次序依赖的一对 `if` 在第一个上方说明；循环上方已有阶段说明时，循环里的 `if` 不再加；单表达式谓词不加。
- `switch` 覆盖枚举全部取值时不写 `default`，新增取值交给 `-Wswitch` 报错；编译器需要出口时在 `switch` 后写 `std::unreachable()`（C++23 起；低标准写 `assert(false)` 或 `std::abort()`），不写 `throw` 兜底。见 `references/language/language-basics/05-expressions.md`。
- 失败是调用方正常结果时返回结果类型、`bool` 或 `std::optional`；函数无法完成自己的任务时抛异常，不拿异常做正常分支。Debug 与 Release 用同一套返回值与抛出条件，只有诊断详略不同。两种模式都要守的不变量用 `Check`（项目保留时），只在开发期做的自检用 `DebugCheck`；项目没有这两个宏时，`Check` 用 `std::terminate()` 兜底，`DebugCheck` 用 `assert`；`assert` 在 Release 不求值，不能代替 `Check`。`Check` 不是 `[[noreturn]]`，条件成立时正常返回；`DebugCheck` 的参数在 Release 不求值，不能放入有副作用的表达式。捕获时按 `const` 引用，只处理能处理的类型，其余继续抛。异常类型、消息格式与「不抛的边界」见 `references/exceptions/throw-rules.md`。
- 参数校验、调用方状态检查与正常结果返回的次序见 `references/exceptions/throw-rules.md` 的「检查次序」：先整局状态，再进行中的玩家与要写入的值，最后交给下层检查坐标与占用，下层检查不重复。改完 `throw` 再走同文件的「检查清单」：异常类型、消息标签、跨行消息先存变量、不吞异常。
- 声明 `noexcept` 前核对函数体：出现 `at()` 或其他可能抛出的调用就去掉。越界用 `at()` 抛 `std::out_of_range`，这个函数就不能标 `noexcept`。普通查询和返回结果枚举的函数，不因为当前函数体不抛就补 `noexcept`；它留给移动、交换、析构，以及已经标上的纯谓词。
- 组合输出用 `std::format`，再写入 `std::cout` / `std::cerr`；库实现里不直接打印。C++23 且库支持时程序边界可用 `std::print`，C++20 及更早没有。
- 转换用具名转换 `static_cast` / `std::bit_cast`，不用 C 风格强制转换。
- 所有权用 `std::unique_ptr`；禁止裸 `new` / `delete`，没有共享所有权的理由时不用 `std::shared_ptr`。
- 只改注释时，不改可观察行为；只改实现时，不改公共声明。两者同时需要时，先改声明，再改实现。
- 清空成员数组：元素类型只提供赋值入口时（如 `Square::SetValue`），容器的 `ClearSquare` 调用 `SetValue(kEmpty)`，`Clear` 再逐格调用 `ClearSquare`；不要把清空操作放回值对象。不要直接写 `squares_ = {}`，也不要从外部把枚举赋成空值。撤销只回退受影响的那一处，不清空整个容器再重放全部历史，见 `references/design/project-design.md` 的「撤销与回退」。
- 默认构造只做「建立初值」时用成员初值（如 `squares_{}`），不在构造函数里再调一遍 `Clear()`；`Clear()` 只负责把已经写入的值清空为 `kEmpty`。

## 情况

**新实现**：先写最短的直路，让第 1 步的验收通过；同样的代码重复出现两次以上再抽函数，不预埋未使用的抽象。

**修缺陷**：先加一个能复现的测试或最小输入，再改实现；修完删掉临时调试输出，保留测试。

**重构**：一次只动一种东西（改名、抽函数、换容器），每步都让测试保持绿色，行为句不变。

**异常边界**：库内部让异常向上传播；程序入口捕获 `std::exception`（或项目自己的异常基类），用 `std::format("错误: {}", error.what())` 打印，返回项目约定的非零退出码。`catch` 子句按派生到基类、具体到通用排序，`catch (...)` 只能放最后，且不要静默返回。不吞掉异常后继续使用无效状态。

## 交回构建

实现改完，先对照配对头文件自检：每个声明都有定义，定义顺序与声明顺序一致；新增或改动的函数按同一套分段约定，需要分阶段的都有阶段注释与空行；只改过语言细节时再过对应目录的完成清单（`references/language/value-types/11-checklist.md`、`language-basics/10-checklist.md`、`standard-library/10-checklist.md`、`performance/07-checklist.md`）；行宽与缩进以工程根 `.clang-format` 为准，注释版式见 `references/comments/comment-style.md`。再跑 `node <skill-dir>/scripts/checking-declaration-order.mjs --root .`（`<skill-dir>` 换成插件 `developing-cpp` 的实际目录），有乱序先修再交回下游：需要新增或移动源文件时，先由 `engineering` 的 `steps/01-targets.md` 把文件显式写进 target；target 齐了再由 `building-cpp` 的 `steps/01-build.md` configure、构建，最后走 `steps/03-check.md`。不要只改完函数体就宣称完成。

## 正反例指针

- 实现注释复述代码、分组混乱：`references/comments/examples/implementation-body.md`。
- 已经证明非负的坐标把下标收成 `std::size_t` 再 `[]`，不转成 `int`：`references/language/value-types/09-subscript.md`。
- 越界消息的函数名、文件与行列都取自调用点：`references/exceptions/throw-rules.md`「消息」的 `std::source_location` 用法。
- 多个入口重复同一范围检查：抽私有函数，`source_location` 默认参数取调用点，见 `references/exceptions/throw-rules.md`「重复的入口检查」。
- 为了保住 `noexcept` 再包一层只转发下标的私有函数：`references/exceptions/throw-rules.md`「不抛的边界」。
- 用 `static_cast<void>` 丢弃 `[[nodiscard]]` 的落子结果，或丢掉调用方给的一手、在 `Game` 内重新拼装：`references/design/examples/move-result.md`。
- 异常类型与结果类型混用：`references/exceptions/examples/throw-when.md`。
- `std::format` 与流输出混用得当：`references/exceptions/examples/throw-message.md`。
