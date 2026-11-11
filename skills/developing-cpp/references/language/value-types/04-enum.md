<!-- 读取时机：查语言细节时；读完能回答：枚举类；预算：一次只开这一份（35 行），不自动串联。 -->
# 枚举类

`enum class` 定义封闭取值集合：

- 枚举值只在类型作用域内可见：`TaskState::kPending`，不写 `kPending`。
- 与整数之间不发生隐式转换；需要编号时写 `static_cast<int>(state)`，只用于输出或既有接口。
- 同类型值可以比较和赋值；不能参与算术。
- 需要固定布局时写底层类型。编号要在头文件里直接读到，就逐个写出来，不靠第一项默认为 0：`enum class TaskState : std::uint8_t { kPending = 0, kActive = 1, kDone = 2 };`

约定：

- 新代码用 `enum class`；unscoped `enum` 只用于兼容 C 接口，不作为默认写法。
- 需要固定布局、序列化或前向声明时写底层类型；本项目的封闭状态码默认写 `: std::uint8_t`，普通枚举用默认底层类型。改动枚举值或底层类型要同步序列化、测试与注释。
- 枚举值的行尾注释要么全写要么全不写；两种句式与禁止项见 `references/comments/01-comment-rules.md`「枚举项与 `struct` 短字段：两种句式」。
- 需要“编号”与“名字”两套表示时，写显式映射函数，例如 `TaskStateToName` / `TaskStateFromName`，不要在枚举和整数之间来回隐式转换。
- 编号按“正常优先”排：0 表示正常态——空、进行中或成功；失败与异常态随后，按固定顺序排列。带缺省语义的枚举（`kEmpty`、`kInProgress`）和返回结果的枚举（`kPlaced`、`kOccupiedSquare`）因此共用同一条约定。身份枚举按领域编号，如 `Player::kX = 1`、`Player::kO = 2`，不套用 0 = 正常态。
- 编号只用于输出和既有接口；要从编号找回名字，仍走显式映射函数，不拿编号做算术。

## 什么时候不用枚举

- 每个取值都真实存在，调用方要 `switch`，成功本身不另带数据：`enum class`。`MatchMode`、`LoopResult`、`PlaceResult`、`Player`、`SquareValue` 留在这里。
- 要么有一个 `T`，要么没有，没有值不需要第二种原因：`std::optional<T>`。`PromptMatchMode`、`PromptDifficulty` 与 `PromptHumanSide` 分别返回 `optional<MatchMode>`、`optional<Difficulty>`、`optional<Player>`。不为「没有」再造 `kEnd`、`kNone`，也不写枚举加出参。
- 成功带 `T`，失败带调用方要读的原因：C++23 用 `std::expected<T, E>`，`E` 仍可以是 `enum class`。本工程的落子没有额外载荷，继续用 `PlaceResult`，不改成 `expected`。
- 一次交出多份互相独立的数据：具名 `struct`。
- 只有是否，没有载荷，两种含义写在 `@return`：`bool`。`Replay` 留在这里。
- 函数完不成自己的合同：沿用异常规则。

依据：Google C++ Style「Inputs and Outputs」、Abseil TotW 176、C++ Core Guidelines F.20/F.21、cppreference `std::optional` 与 `std::expected`。

## 标准与推荐

- ISO C++ `[dcl.enum]`：`enum class` 的作用域、不隐式转换与底层类型规则。https://eel.is/c++draft/dcl.enum
- Google C++ Style, Enumerator Names：枚举子按常量命名（`kEnumName`），不用宏风格。https://google.github.io/styleguide/cppguide.html#Enumerator_Names
- C++ Core Guidelines `Enum.1`/`Enum.3` 建议用枚举代替宏、优先 `enum class`；`Enum.7`/`Enum.8` 建议底层类型与显式编号只在必要时写。本项目为稳定存储与输出固定 `uint8_t` 并显式编号，是有意偏离，改动时要同步序列化与测试。https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-enum
- cppreference `std::error_code`：`clear()` 把值置为 0，`operator bool` 只把非 0 当作错误；结果编号沿用 0 = 成功。https://en.cppreference.com/w/cpp/error/error_code
