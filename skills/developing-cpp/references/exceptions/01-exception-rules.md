<!-- 读取时机：抛异常或写异常契约时；读完能回答：异常与错误；预算：一次只开这一份（207 行），不自动串联。 -->
# 异常与错误

本文件是**开发阶段**的源码写作指导，只在 `developing-cpp` 被打开时阅读。插件运行时不编译 C++、不执行示例，也不把这里的规定送进任何运行时流程；它只是一份随技能分发的 Markdown 参考。

Google C++ Style Guide 明确写「We do not use C++ exceptions」。本工作流在书面规范上做一次有边界、可追溯的偏离：**源码示例和异常指导采用 C++ Core Guidelines 的 Error handling 规则**，因为这套规则由 Bjarne Stroustrup 与 Herb Sutter 编辑，代表现代 C++ 社区对异常安全、RAII 和 invariant 的共识。偏离只覆盖异常这一节；其他排版、命名、类型和注释规则仍以 Google 为准。不要在工程里同时引入 LLVM、Chromium 或 Abseil 的异常政策作为第二套标准。

规范来源：

- [C++ Core Guidelines: Error handling](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-errors)（E.1–E.31）。
- [Boost.Exception](https://www.boost.org/doc/libs/latest/libs/exception/doc/boost-exception.html)：异常类型层级的工程典范，只借它的结构，不把 Boost 变成依赖。
- [ISO C++ `[except]`](https://eel.is/c++draft/except)：异常对象、栈展开与构造/析构期间的规则。
- [cppreference: Exceptions](https://en.cppreference.com/w/cpp/language/exceptions)：异常安全保证与 `noexcept` 的语法参考。

## 先定错误策略

E.1 要求尽早决定错误处理策略：先问调用方还能不能继续、失败是正常结果还是 invariant 已破坏、消息是否需要跨层携带，再写接口。

策略一旦定下，声明、实现、测试和入口都用同一套；不要在同一层里一半返回错误码、一半抛异常。

判断是否算「混用」，看函数合同而不是看返回类型：查询必须产出一个值、失败时产不出（如 `GetSquareValue` 坐标越界），就抛；写入操作把「这一手写不进」当作正常结果、调用方本来就要分支（如 `Game::Place` 返回 `PlaceResult`，玩家、终局与占用各有一个取值），就用返回值。动作可能因为多个前置条件失败、而调用方需要区分原因时，返回 `enum class` 而不是 `bool` 加输出参数。两者并存时，公共头必须把「拒绝」与「抛」的边界各写一行；没有这行注释才算混用。

## 什么时候抛

E.2：函数不能完成它被分配的任务时，就抛异常；构造函数无法建立 invariant 时也抛，而不是留下半初始化对象。E.3：异常只用于错误处理，不能拿 `throw` 当返回值或正常分支。E.4：错误处理围绕 invariant 设计，而不是围绕「哪一行可能失败」。E.5：构造函数负责建立 invariant，失败就抛。E.6：用 RAII 防止泄漏，优先局部对象而不是裸 `new`。

判断句可以写成：**调用方是否还能履行自己的合同？** 不能，就让异常向上传播；能，并且失败是接口的正常结果，就用返回值、`std::optional` 或项目自己的结果类型表达。不要为了「统一」把可恢复的业务分支包成异常，也不要把已经无法维持 invariant 的状态压成错误码继续跑。

## 检查次序

同一个函数既有前置条件、又有正常结果时，先判断这次调用还能不能进行，再校验调用方送来的参数，最后把能交给下层的工作交给下层。次序按「哪条判断决定这一步能否进行」排：

1. 整局状态：对局是否结束由 `Game::GetResult` 回答，已结束时它返回 `kXWin`、`kOWin` 或 `kDraw`，本次落子返回 `PlaceResult::kFinishedGame`，玩家、坐标、棋盘与历史都不再检查。对局已经无法继续时，再谈「轮到谁」没有意义。
2. 本层状态的前置条件：这一步是否轮到该玩家。对局自己记着轮次，这一条用返回值 `kInvalidPlayer` 答，调用方按结果分支，不抛。
3. 下层的检查与剩余的写入条件：读取目标格时由 `Board::IsSquareEmpty` 抛出 `std::out_of_range`；方格已有值返回 `kOccupiedSquare`。不要为了提前抛出而在 `Game` 里重复 `Board::IsInRange`。
4. 执行操作并返回 `kPlaced`：写入棋盘、记录历史、换方，三步按这个次序做；写棋盘前预留整盘手数的容量，后续写入阶段不分配内存。

整局状态排在最前，因为对局结束后这次调用根本不会落子，玩家与坐标都只是无关的输入；把玩家检查排在前面，会让「终局后落子」被解释成玩家错误。本层负责的返回值检查仍必须排在「交给下层」之前：`Game::Place` 若先把坐标交给 `Board::IsSquareEmpty`，越界异常会把「不是当前玩家」一起盖掉，调用方拿不到真正的拒绝原因。属于下层的检查不在此列：对局已结束时 `Game` 不再进入棋盘，越界坐标随 `kFinishedGame` 一起返回，这是正常的短路，不是遗漏。

「失败尽早返回」有一手依据：[F.56](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#f-nesting) 写「Use a guard-clause to take care of exceptional cases and return early.」。标准库的格式化输入也按这个方向：sentry 为 `false` 时「returns without attempting to obtain any input」，而 sentry 在 `is.good()` 为 `false` 时即判失败（[istream.sentry](https://eel.is/c++draft/istream.sentry)、[istream.formatted.reqmts](https://eel.is/c++draft/istream.formatted.reqmts)）。但「先判对象状态、再校验参数」这一条次序本身没有一手条文：Google C++ Style Guide 全篇没有前提条件与参数校验的次序规定，Rust API Guidelines 只要求尽量校验输入、不规定校验函数返回什么。所以它是本工作流的约定，理由是状态不依赖参数，先判可以直接短路，也不会把终局后的落子误报成玩家错误。

参数之间按固定的语义顺序排，不要求与声明顺序一致；关键是同一函数内不来回换，注释、测试和消息都按这个次序。

```cpp
PlaceResult Game::Place(Move move) {
    // 先判终局，再判玩家与方格：失败结果的优先级由此决定。
    if (!IsInProgress()) {
        return PlaceResult::kFinishedGame;
    }

    if (current_player_ != move.player) {
        return PlaceResult::kInvalidPlayer;
    }

    const SquareValue target_square_value = PlayerToSquareValue(move.player);
    if (!board_.IsSquareEmpty(move.position)) {
        return PlaceResult::kOccupiedSquare;
    }

    history_.reserve(Board::kSquares);
    board_.SetSquareValue(move.position, target_square_value);
    history_.push_back(move);
    current_player_ = PlayerToOpponent(current_player_);
    return PlaceResult::kPlaced;
}
```

### 重复的入口检查

同一层有多个入口重复同一个 `if (!IsInRange(...)) throw ...` 时，把检查收进一个函数，参数与 `IsInRange` 相同。消息的标签就是函数名，不再另外取调用点：

```cpp
void Board::CheckInRange(const Position& position) {
    if (!IsInRange(position)) {
        throw std::out_of_range{std::format("Board::CheckInRange: position ({}, {}) out of range for {}x{} board",
                                            position.row, position.column, kRows, kColumns)};
    }
}
```

声明写成 `static void CheckInRange(const Position& position);`，紧挨 `IsInRange`，放在 public 区：对局层要先确认坐标再决定怎么写时可以直接调用它，不必复制一份判断。两个函数都只接坐标，不接调用点信息；调用点上一行写一句 `// 坐标越界时由 CheckInRange 抛出。`，本行只写 `CheckInRange(position);`。

标签 `Board::CheckInRange` 已经指明是哪一步拒绝了这次调用；要行号就在调试器里看调用栈，不把调用点信息穿过签名。测试只断言值、限度与标签，源码移动后测试不会失效。

依据：[Core Guidelines I.5](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#ri-pre)、[I.6](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#ri-expects) 把前置条件写进接口；标准库的 `vector::at` 与 `std::stoi` 在访问前检查边界，.NET 的 [CA1062](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1062) 也要求先验证再使用。[P2053R0](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2020/p2053r0.pdf) 区分输入校验与防御性检查：外部输入必须校验，内部前置条件可用断言或 contract 表达。这里只让坐标范围抛异常，因为这份数据由 `Board` 拥有，重复判断会让同一规则出现两份，消息与异常类型还可能分叉；玩家与整局状态是 `Game` 自己拥有的前置条件，用返回值答，调用方本来就要按结果分支。`Player` 的取值由适配层保证；坐标越界属于调用方的程序错误，不是对局里的正常分支，所以仍抛出。

## 异常类型

E.14：用专门的用户定义类型表示异常，不要抛内建类型、`std::string` 或字符串字面量。类型本身可以只表达语义，数据放在成员里；也可以完全不带数据，让 `catch` 只按类型选择。

```cpp
// 领域错误：类型即语义，调用方可以只捕获自己认识的那一支。
class ParseError : public std::runtime_error {
public:
    explicit ParseError(const std::string& message) : std::runtime_error(message) {}
};
```

标准库已经命名的失败直接用标准类型：坐标越界用 `std::out_of_range`，实参不满足函数合同（如封闭枚举收到非法值）用 `std::invalid_argument`，调用时不变量已破坏用 `std::logic_error`；正常输入里的解析失败不抛，按上文用返回值表达，只有调用方无法继续的诊断失败才用 `std::runtime_error`。只有调用方必须把这些失败和上述类型区分开时，才新增派生自它们的类型；不要为了「看起来规范」给每个参数错误都建一支。项目若定义自己的异常基类（如 `Error`），先定基类再按领域派生，调用方捕获基类就能接住整族异常。

抛还是返回，看失败的那个值由谁拥有。取值规则由本类型拥有时（如方格的取值、棋盘的坐标），判断只写在这一处，违反时抛异常，免得同一条规则出现两份、消息与类型分叉；状态由上层拥有时（如对局状态），用返回值答，调用方本来就要按结果分支。写入函数只兑现写入，不回答「能不能落」；这类查询见下文 E.13 与 `references/design/examples/07-preview-read.md`。

## 两种构建模式的三层合同

库的失败方式在 Debug 与 Release 下必须可预测；只有诊断信息的详略可以不同。

- 返回值：两种模式完全一致。函数用返回值报告可恢复失败时，Debug 不得改成抛异常，Release 也不得把异常改成错误码。
- 标准异常：两种模式的抛出条件相同。越界抛 `std::out_of_range`，实参不满足函数合同抛 `std::invalid_argument`，调用时不变量已破坏抛 `std::logic_error`；项目若定义 `Error` 基类，派生类型同时派生自 `std::exception`，消息内容不随构建模式变化。
- `Check`：项目保留这种断言时，两种模式都检查，失败时打印诊断并终止；用于 invariant 已被破坏、继续执行没有意义的场合。没有 `Check` 的项目：两种模式都必须执行的检查用 `std::terminate`（失败前先打印诊断），只在开发期做的自检用 `assert`，不另写包装。
- `DebugCheck`：项目保留时只在 Debug 生效，`NDEBUG` 后展开为空；用于代价高、只在开发期值得做的自检。不得用它承担 Release 也必须执行的检查。

`Check` 不是 `[[noreturn]]`：条件成立时正常返回。`DebugCheck` 的参数在 Release 不求值，不能放入有副作用的表达式。

## 抛出与捕获

E.15：按值抛出、按引用捕获（通常是 `const` 引用）；不要抛裸指针；重新抛出用 `throw;`，不要 `throw error;` 丢类型。捕获后能补偿才捕获，不能补偿就让异常继续向上。

E.17：不要在每个函数里捕获所有异常。E.18：少用显式 `try/catch`，优先 RAII 和 `finally` 风格的清理对象。E.19：没有资源句柄时，用 `final_action` 之类的 scope guard 做清理。

E.31：`catch` 子句从派生到基类、从具体到通用排序，`catch (...)` 只能放最后。不要 `catch (...)` 后静默返回，除非当前层真的能把错误翻译成调用方合同的一部分。

## 不抛的边界

E.12：在不可能或不可接受抛异常的地方用 `noexcept`。声明前先读实现：函数体里出现 `at()` 或其他可能抛出的调用，就去掉 `noexcept`；不要再包一层只转发下标的私有函数来维持 `noexcept`，直接写 `squares_.at(row).at(col)` 并去掉 `noexcept`。正例是只比较两个整数的 `IsInRange`；反例是用 `at()` 读取并会抛 `std::out_of_range` 的 `GetSquareValue`。普通查询和返回结果枚举的函数，不因为当前函数体不抛就补 `noexcept`；`noexcept` 留给移动、交换、析构，以及已经标上的纯谓词。E.13：直接拥有资源的函数不要抛，资源释放应交给 RAII。预览查询要同时拒绝越界与占用时，把越界留给下层抛出、占用返回结果值，写法见 `references/design/examples/07-preview-read.md`。E.16：析构、`deallocate`、`swap` 以及异常类型的拷贝/移动构造不得失败；析构和 `swap` 应当是 `noexcept`。

E.30：不要写异常规范（`throw(...)` 之类）；C++11 之后用 `noexcept` 表达「不抛」。需要无异常构建时，由项目单独决定，不要把这套异常指导改写成两面都对的模糊话。

## 程序入口

库让异常向上传播，入口是翻译边界：捕获 `std::exception`，输出可理解的诊断，返回项目约定的非零退出码。退出码的具体取值属于项目合同，本节不规定 0/1/2。前缀文本由项目按读者约定，示例中的 `错误: ` 只是示例。

```cpp
int main() {
    try {
        return Run(std::cin, std::cout);
    } catch (const std::exception& error) {
        std::cerr << std::format("错误: {}\n", error.what());
        return 1;
    }
}
```

消息要能让调用者定位操作和关键值，句式见下节；`std::format` 只是构造 `what()` 或边界消息的方式。

## 消息

`what()` 是给程序员看的诊断文本，句式是「标签: 完整句」。标签写明来源，句子主语是失败的值或对象，谓语说明哪里不对，实际值直接插进句子，限度用 `for` 接在句末。标签是标识符，成员写 `Type::Function`，自由函数只写函数名，冒号后一个空格。每个抛出的站点都写标签，包括只在内部使用的检查函数：标签是捕获处唯一的来源信息，少了它只能从异常类型猜是哪一步失败。标签后面接完整句，例如 `Board::CheckInRange: position (3, 1) out of range for 3x3 board`：先写哪个值失败，再写失败条件，最后写限度；语言由项目约定，下面的示例用英文。句子要完整：主语和谓语都在，不写 `board position is out of range` 这种重复标签类型的主语，也不把位置以外的值塞进括号，不写 Error / Failed 或空泛的「失败」。实际值用 `{}` 直接放进句子，不再写 `(name=value)`；没有实际值就不写值，没有限度就不写 `for`。需要原因时用 `because`，不要用分号堆叠。封闭枚举只列出允许的具名值，不为了显示而转换底层值；确需定位非法转换时，才把 `static_cast` 后的值写进消息。

英文消息只用 `:`、`()`、`,`、`=` 四个 ASCII 符号：冒号紧贴标签、后接一个空格；括号只放次要值或补充说明；逗号前不空、后一个空格；等号两侧不空。一条消息里只有一个冒号，就是标签后的那个；不用句号、问号、感叹号、破折号或 `×`；句子小写开头，句末不加句号；尺寸写 `3x3`，`out of range` 不加连字符。中文消息按中文标点，但句式与「值在前、限度在后」的顺序不变。

值对象已有 `std::formatter` 时，格式串直接写 `{}`，不要拆成多个字段；例如 `position {}` 会输出 `position (-1, 0)`。没有格式化器的类型才拆字段。

有插值才用 `std::format`，没有洞的消息用字符串字面量。`std::out_of_range` 与 `std::logic_error` 在构造时复制消息，不能把格式化推迟到 `what()`。格式串只填手头的整数和短文本；格式化若抛出，调用方看到 `std::format_error` 或 `std::bad_alloc`，所以不在抛出表达式里做 I/O。自有异常类型才在 `what()` 里惰性格式化并兜底，本仓库不为此新增类型。

`what()` 不是分支接口；调用方要数字就放进类型成员，不解析字符串。入口可以在消息前加面向用户的前缀，库代码不打印日志。

写进 `throw` 时，消息直接内联。格式串与实参放不下时，实参按 `std::format` 的开括号对齐续行，整条语句仍是一个表达式，异常类型与格式串首行同现：

```cpp
throw std::out_of_range{std::format("Board::CheckInRange: position ({}, {}) out of range for {}x{} board",
                                    position.row, position.column, kRows, kColumns)};
throw ParseError{"ParseConfig: line has no key"};
```

同一句消息要在多处复用、或格式串本身跨两行时，先把消息存进 `const std::string message`，再写一行 `throw`：`throw` 行只表达抛什么，格式串与参数留在上一句。消息没有插值时只写字符串字面量，不调 `std::format`：`throw std::logic_error{"ReadConfig: the first line is empty"};`。

常用库把消息的构造放进异常类型或辅助函数：spdlog 的 `spdlog_ex` 在构造函数里写 `msg_`，CLI11 的 `Error` 族在静态工厂里拼好句子，POCO 的 `Exception` 在构造函数里存消息；调用处因此只有一行 `throw ...(...)`。本工作流在消息复用或格式串跨行时才引入 `const std::string message`（需要 `#include <string>`），变量名固定，不写 `std::move`；异常类型构造时复制消息。

Rust 把失败分成两类：`Result` 表示可预期的失败，用 `?` 传播；`panic!` 只表示程序里的 bug（invariant 已被破坏），消息同样在调用点构造；跨行时先在调用点拼好再抛出。C++ 的异常同时承担这两种职责，本工作流因此把「调用方无法继续」写成异常，把「可恢复的拒绝」写成返回值。

这两条是本工作流的选择，不是普遍更优：Google C++ Style Guide 整体禁用异常，只保留「用户输入不应引发异常」这一条共识；Core Guidelines E.27 的说法是「不能抛异常时改用错误码系统」。C++23 项目也可以把可预期的失败写成 `std::expected<T, E>`，或用带字段的 struct 一次返回多个值；本工作流的公共接口不用 out 参数表达结果；唯一例外是热循环里复用容器容量的底层缓冲函数，且只在函数名与注释都写明追加目标时使用。

```cpp
const std::string message =
        std::format("ReadConfig: {} has no header because the first line is empty", path);
throw ParseError{message};

throw std::logic_error{"ReadConfig: the first line is empty"};
throw std::format_error{"Position: format specifier is not supported, use {} instead"};
```

反例：`Game::Place: the move is not acceptable (player={}); the game is in progress`。标签已经说明是 `Game::Place`，句子又用 `the move` 当空泛主语，实际值还放在括号里；读者要在标签、主语和括号之间来回拼。

## 声明注释

在公共声明的注释里写清：什么条件下抛、抛哪一类、调用方如何避免。实现文件里的内部异常不必逐条写进公共头。

```cpp
/// 读取配置文件。
/// @throws FileReadError 文件不存在或无法读取。
/// @throws ParseError 内容不是合法配置。
Config ReadConfig(const std::filesystem::path& path);
```

## 检查清单

- [ ] 错误策略在接口设计时已确定，同一层没有混用错误码和异常。
- [ ] 构造函数失败时抛异常，没有留下半初始化对象。
- [ ] 异常类型有语义，没有抛内建类型、字符串或裸指针。
- [ ] 一行写得下的 `throw` 直接接收 `std::format(...)` 或字面量；消息要在多处复用或格式串跨两行时才先建 `const std::string message`，再 `throw` 变量。
- [ ] 按值抛出、按 `const` 引用捕获；重抛用 `throw;`。
- [ ] 析构、`swap`、异常类型的拷贝/移动不抛。
- [ ] 没有用异常做正常分支，也没有在每个函数里捕获所有异常。
- [ ] 本层负责的参数校验与状态检查排在正常结果返回之前；非法参数没有被 `kXWin`、`kOWin` 或 `kDraw` 之类的终局结果掩盖。
- [ ] 入口有统一捕获，消息可定位，退出码符合项目合同。
- [ ] 公共声明的 `@throws` 与实际抛出类型一致，且 Debug/Release 的抛出条件相同。
- [ ] 每个 `noexcept` 函数的函数体不调用 `at()` 或其他会抛的接口。
- [ ] 项目若保留 `Check` / `DebugCheck`：`Check` 两模式都生效，`DebugCheck` 只在 Debug 生效；没有让 Debug 抛、Release 返回 false。
