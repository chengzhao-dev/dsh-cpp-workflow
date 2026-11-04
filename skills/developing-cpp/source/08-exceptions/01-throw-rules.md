# 异常与错误

本文件是**开发阶段**的源码写作指导，只在 `developing-cpp` 被打开时阅读。插件运行时不编译 C++、不执行示例，也不把这里的规定送进任何运行时流程；它只是一份随技能分发的 Markdown 参考。

Google C++ Style Guide 明确写「We do not use C++ exceptions」。本工作流在书面规范上做一次有边界、可追溯的偏离：**源码示例和异常指导采用 C++ Core Guidelines 的 Error handling 规则**，因为这套规则由 Bjarne Stroustrup 与 Herb Sutter 编辑，代表现代 C++ 社区对异常安全、RAII 和 invariant 的共识。偏离只覆盖异常这一节；其他排版、命名、类型和注释规则仍以 Google 为准。不要在工程里同时引入 LLVM、Chromium 或 Abseil 的异常政策作为第二套标准。

规范来源：

- [C++ Core Guidelines: Error handling](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-errors)（E.1–E.31）。
- [Boost.Exception](https://www.boost.org/doc/libs/latest/libs/exception/doc/boost-exception.html)：异常类型层级的工程典范，只借它的结构，不把 Boost 变成依赖。

## 先定错误策略

E.1 要求尽早决定错误处理策略：先问调用方还能不能继续、失败是正常结果还是 invariant 已破坏、消息是否需要跨层携带，再写接口。

策略一旦定下，声明、实现、测试和入口都用同一套；不要在同一层里一半返回错误码、一半抛异常。

判断是否算「混用」，看函数合同而不是看返回类型：查询必须产出一个值、失败时产不出（如 `GetState` 越界），就抛；写入操作把「这次不写」当作正常结果、调用方本来就要分支（如 `Board::Place` 返回 `Cell::PlaceResult::kOccupied`，`CheckPlaceable` 返回具体原因），就用返回值。动作可能因为多个前置条件失败、而调用方需要区分原因时，返回 `enum class` 而不是 `bool` 加输出参数。两者并存时，公共头必须把「拒绝」与「抛」的边界各写一行；没有这行注释才算混用。

## 什么时候抛

E.2：函数不能完成它被分配的任务时，就抛异常；构造函数无法建立 invariant 时也抛，而不是留下半初始化对象。E.3：异常只用于错误处理，不能拿 `throw` 当返回值或正常分支。E.4：错误处理围绕 invariant 设计，而不是围绕「哪一行可能失败」。E.5：构造函数负责建立 invariant，失败就抛。E.6：用 RAII 防止泄漏，优先局部对象而不是裸 `new`。

判断句可以写成：**调用方是否还能履行自己的合同？** 不能，就让异常向上传播；能，并且失败是接口的正常结果，就用返回值、`std::optional` 或项目自己的结果类型表达。不要为了「统一」把可恢复的业务分支包成异常，也不要把已经无法维持 invariant 的状态压成错误码继续跑。

## 检查次序

同一个函数既有前置条件、又有正常结果时，先处理本层负责的前置条件，再返回正常结果，最后把能交给下层的工作交给下层。次序按「这一层是否拥有这个判断」排：

1. 本层状态的前置条件：这一步是否轮到该玩家、对象是否已初始化。前置条件不成立是调用方的程序错误，抛 `std::logic_error`。
2. 正常业务结果：对局已结束、目标格已占用。它们是函数要返回的结果，不是异常。
3. 下层自己的检查：坐标范围、格子是否为空由 `Board::Place` 判断；不要为了提前抛出而在 `Game` 里重复 `Board::IsInRange`。
4. 执行操作并返回结果。

本层负责的抛出检查必须排在「返回正常失败」之前。否则终局会先返回 `kFinished`，把「不是当前玩家」一起吞掉，调用方拿不到真正的调用错误。属于下层的检查不在此列：对局已结束时 `Game` 不再进入棋盘，越界坐标随 `kFinished` 一起返回，这是正常的短路，不是遗漏。

参数之间按固定的语义顺序排，不要求与声明顺序一致；关键是同一函数内不来回换，注释、测试和消息都按这个次序。

```cpp
Game::MoveResult Game::Place(Move move) {
  if (move.player != current_player_) {
    throw std::logic_error{std::format(
        "Game::Place: move player is not the current player (move={}, current={})",
        move, current_player_)};
  }
  if (board_.GetState() != BoardState::kInProgress) {
    return MoveResult::kFinished;
  }
  // 坐标范围与占用由 Board::Place 检查。
  const Cell::PlaceResult result = board_.Place(move.position, PlayerToCellState(move.player));
  // 按 result 写历史、返回占用或抛出棋盘拒绝。
}
```

依据：[Core Guidelines I.5](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Ri-pre)、[I.6](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Ri-expects) 把前置条件写进接口；标准库的 `vector::at` 与 `std::stoi` 在访问前检查边界，.NET 的 [CA1062](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1062) 也要求先验证再使用。[P2053R0](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2020/p2053r0.pdf) 区分输入校验与防御性检查：外部输入必须校验，内部前置条件可用断言或 contract 表达。这里只把 `Game` 自己拥有的状态前置条件写成异常；`Player` 的取值由适配层保证，坐标范围由 `Board` 拥有，重复检查会让同一规则出现两份，消息与异常类型还可能分叉。参数非法时返回一个业务结果，会让调用方以为「只是不能下这里」，而不是「这手棋本身不成立」。

## 异常类型

E.14：用专门的用户定义类型表示异常，不要抛内建类型、`std::string` 或字符串字面量。类型本身可以只表达语义，数据放在成员里；也可以完全不带数据，让 `catch` 只按类型选择。

```cpp
// 领域错误：类型即语义，调用方可以只捕获自己认识的那一支。
class ParseError : public std::runtime_error {
 public:
  explicit ParseError(const std::string& message) : std::runtime_error(message) {}
};
```

标准库已经命名的失败直接用标准类型：坐标越界用 `std::out_of_range`，调用时不变量已破坏用 `std::logic_error`，正常输入里的解析失败可以用 `std::runtime_error`。只有调用方必须把这些失败和上述类型区分开时，才新增派生自它们的类型；不要为了「看起来规范」给每个参数错误都建一支。项目若定义自己的异常基类（如 `Error`），先定基类再按领域派生，调用方捕获基类就能接住整族异常。

## 两种构建模式的三层合同

库的失败方式在 Debug 与 Release 下必须可预测；只有诊断信息的详略可以不同。

- 返回值：两种模式完全一致。函数用返回值报告可恢复失败时，Debug 不得改成抛异常，Release 也不得把异常改成错误码。
- 标准异常：两种模式的抛出条件相同。越界抛 `std::out_of_range`，前置条件被破坏抛 `std::logic_error`；项目若定义 `Error` 基类，派生类型同时派生自 `std::exception`，Debug 的 `what()` 可带 `file:line`，Release 只留值。
- `Check`：项目保留这种断言时，两种模式都检查，失败时打印诊断并终止；用于 invariant 已被破坏、继续执行没有意义的场合。没有 `Check` 的项目直接用 `assert` 或 `std::terminate` 表达同一边界，不另写包装。
- `DebugCheck`：项目保留时只在 Debug 生效，`NDEBUG` 后展开为空；用于代价高、只在开发期值得做的自检。不得用它承担 Release 也必须执行的检查。

`Check` 不是 `[[noreturn]]`：条件成立时正常返回。`DebugCheck` 的参数在 Release 不求值，不能放入有副作用的表达式。

## 抛出与捕获

E.15：按值抛出、按引用捕获（通常是 `const` 引用）；不要抛裸指针；重新抛出用 `throw;`，不要 `throw error;` 丢类型。捕获后能补偿才捕获，不能补偿就让异常继续向上。

E.17：不要在每个函数里捕获所有异常。E.18：少用显式 `try/catch`，优先 RAII 和 `finally` 风格的清理对象。E.19：没有资源句柄时，用 `final_action` 之类的 scope guard 做清理。

E.31：`catch` 子句从派生到基类、从具体到通用排序，`catch (...)` 只能放最后。不要 `catch (...)` 后静默返回，除非当前层真的能把错误翻译成调用方合同的一部分。

## 不抛的边界

E.12：在不可能或不可接受抛异常的地方用 `noexcept`。声明前先读实现：函数体里出现 `at()` 或其他可能抛出的调用，就去掉 `noexcept`；不要再包一层只转发下标的私有函数来维持 `noexcept`，直接写 `cells_.at(row).at(col)` 并去掉 `noexcept`。正例是只比较两个整数的 `IsInRange`；反例是用 `at()` 读取并会抛 `std::out_of_range` 的 `GetState`。普通查询和返回结果枚举的函数，不因为当前函数体不抛就补 `noexcept`；`noexcept` 留给移动、交换、析构，以及已经标上的纯谓词。E.13：直接拥有资源的函数不要抛，资源释放应交给 RAII。E.16：析构、`deallocate`、`swap` 以及异常类型的拷贝/移动构造不得失败；析构和 `swap` 应当是 `noexcept`。

E.30：不要写异常规范（`throw(...)` 之类）；C++11 之后用 `noexcept` 表达「不抛」。需要无异常构建时，由项目单独决定，不要把这套异常指导改写成两面都对的模糊话。

## 程序入口

库让异常向上传播，入口是翻译边界：捕获 `std::exception`，输出可理解的诊断，返回项目约定的非零退出码。退出码的具体取值属于项目合同，本节不规定 0/1/2。

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

消息要能让调用者定位操作和关键值，句式见下节；`std::format` 只是构造 `what()` 或边界消息的方式。C++20 及更早没有 `std::print`；默认 C++23 且标准库支持时，可在程序边界用 `std::print`，库代码仍只组合消息、不直接打印。

## 消息

`what()` 是给程序员看的诊断文本，句式是「标签: 完整句」。标签写明来源，句子主语是失败的值或对象，谓语说明哪里不对，实际值直接插进句子，限度用 `for` 接在句末。标签是标识符，成员写 `Type::Function`，自由函数只写函数名，冒号后一个空格；默认参数用 `std::source_location::current()` 在调用点求值时，标签写 `function_name()`。先写哪个值失败，再写失败条件，最后写限度；语言由项目约定，下面的示例用英文。句子要完整：主语和谓语都在，不写 `board position is out of range` 这种重复标签类型的主语，也不把值塞进括号，不写 Error / Failed 或空泛的「失败」。实际值用 `{}` 直接放进句子，不再写 `(name=value)`；没有实际值就不写值，没有限度就不写 `for`。需要原因时用 `because`，不要用分号堆叠。

英文消息只用 `:`、`()`、`,`、`=` 四个 ASCII 符号：冒号紧贴标签、后接一个空格；括号只放次要值或补充说明；逗号前不空、后一个空格；等号两侧不空。不用第二个冒号、句号、问号、感叹号、破折号或 `×`；句子小写开头，句末不加句号；尺寸写 `3x3`，`out of range` 不加连字符。中文消息按中文标点，但句式与「值在前、限度在后」的顺序不变。

值对象已有 `std::formatter` 时，格式串直接写 `{}`，不要拆成多个字段；例如 `position {}` 会输出 `position (-1, 0)`。没有格式化器的类型才拆字段。

有插值才用 `std::format`，没有洞的消息用字符串字面量。`std::out_of_range` 与 `std::logic_error` 在构造时复制消息，不能把格式化推迟到 `what()`。格式串只填手头的整数和短文本；格式化若抛出，调用方看到 `std::format_error` 或 `std::bad_alloc`，所以不在抛出表达式里做 I/O。自有异常类型才在 `what()` 里惰性格式化并兜底，本仓库不为此新增类型。

`what()` 不是分支接口；调用方要数字就放进类型成员，不解析字符串。入口可以在消息前加面向用户的前缀，库代码不打印日志。

```cpp
throw std::out_of_range{std::format(
    "Board::GetCell: position {} is out of range for board {}x{}",
    pos, kRowCount, kColumnCount)};
throw std::logic_error{std::format(
    "Game::Place: board rejected move {} because the cell state is empty", move)};
throw std::logic_error{"ChooseCell: game is already over"};
throw std::logic_error{"EmptyCellsOrThrow: there is no empty cell left to place"};
```

反例：`Board::GetCell: board position is out of range (position={}); board is {}x{}`。标签已经说明是 `Board::GetCell`，句子又用 `board position` 当主语，实际值还放在括号里；读者要在标签、主语和括号之间来回拼。

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
- [ ] 按值抛出、按 `const` 引用捕获；重抛用 `throw;`。
- [ ] 析构、`swap`、异常类型的拷贝/移动不抛。
- [ ] 没有用异常做正常分支，也没有在每个函数里捕获所有异常。
- [ ] 本层负责的参数校验与状态检查排在正常结果返回之前；非法参数没有被 `kFinished` 之类的业务结果掩盖。
- [ ] 入口有统一捕获，消息可定位，退出码符合项目合同。
- [ ] 公共声明的 `@throws` 与实际抛出类型一致，且 Debug/Release 的抛出条件相同。
- [ ] 每个 `noexcept` 函数的函数体不调用 `at()` 或其他会抛的接口。
- [ ] 项目若保留 `Check` / `DebugCheck`：`Check` 两模式都生效，`DebugCheck` 只在 Debug 生效；没有让 Debug 抛、Release 返回 false。
