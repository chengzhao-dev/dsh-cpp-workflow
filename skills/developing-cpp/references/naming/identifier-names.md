# 命名

命名先回答「它是什么角色」，再选词。规则表是底线，语义角色表决定用哪个动词。

## 规则表

| 种类 | 规则 | 好 | 差 |
| --- | --- | --- | --- |
| 类型 / 类 / 结构 / 枚举 | PascalCase | `TaskTable`, `Order`, `TaskState` | `task_table_t`, `order_result` |
| 函数 / 成员函数 | PascalCase | `Contains`, `GetTaskState` | `contains`, `gettaskstate` |
| 变量 / 参数 | snake_case | `task_count`, `order` | `TaskCount`, `o` |
| 类成员 | snake_case + `_` | `tasks_`, `orders_` | `m_tasks`, `tasks` |
| 结构体成员 | snake_case，无尾随 `_` | `name`, `priority` | `name_`, `priority_` |
| 常量 / 枚举子 | `k` + PascalCase | `kTaskCount`, `Order::kDraft` | `TASK_COUNT`, `Draft` |
| 命名空间 | snake_case | `taskflow`, `warehouse` | `Taskflow`, `Warehouse` |
| 宏 | 全大写 + 项目前缀，尽量不用 | `CPP_WORKFLOW_ASSERT` | `ASSERT` |
| 模板类型参数 | PascalCase | `T`, `Item` | `t`, `item_t` |
| 非类型模板参数 | 按常量或变量 | `kMaxItems`, `count` | `N`, `MAX` |
| 概念 | PascalCase | `Sortable`, `Hashable` | `sortable`, `is_hashable` |

- 文件名用 snake_case：`order_result.h`、`task_table.cpp`；测试文件 `task_table_test.cpp`。Google 也允许 `-`，本项目统一 `_`，与 target 和测试名保持一致。
- 查询名与返回类型一致：返回方格的值时写 `GetCurrentValue`，返回玩家时写 `GetCurrentPlayer`；不写项目里没有对应类型的 `GetPlayer`。
- 命名空间的自由函数用 `来源To结果` 加返回值类型，不用 `Get`：玩家换方写 `PlayerToOpponent`，玩家变成方格的值写 `PlayerToSquareValue`，不写 `SquareValueOf`。`Get` 留给类里直接返回成员的查询，如 `GetCurrentPlayer`。`To` 后面先写结果类型再写角色，`PlayerToOpponent` 不带重复的 `Player`；没有 `To` 承接时单个 `Opponent` 读不出是玩家还是方格，`To` 语境下反而清楚。名字要点明两端角色，与注释同一个说法。
- 布尔变量用 `is_` / `has_` / `can_` 开头：`is_valid`、`has_stock`；不要用 `flag`、`status`。
- 容器用复数：`tasks`、`orders`；单个元素用单数。
- 缩写按单词处理：`url`、`id`、`http`，不要写 `URL` 混进 snake_case；类型名里可以 `HttpClient`。
- 不用单字母名：坐标参数和局部变量用 `pos`，行、列用 `row`、`col`；公开数据成员仍用完整名词（`Move::position`），避免 API 缩写；迭代器式的位置参数才写完整 `position`。取舍依据与更多词见 [naming-terms.md](glossary/naming-terms.md)。`i` / `j` 只用于没有领域名字的计数（如遍历固定长度的下标）。也不要用 `data`、`info`、`tmp` 这类不说明内容的名字。
- 参数或局部变量的类型已在签名里写明时，用主流缩写而不是重复类型名：`Position pos`，不写 `Position position`；缩写只在含义无歧义时使用。
- 局部变量与类成员用同一套词根：成员叫 `current_player_`，局部就叫 `current_player`，不写 `currentPlayer` 这类 camelCase。涉及多个对象时把角色写进名字，如 `target_square`、`target_square_value`，不要用 `target` 这种离开上下文读不出对象的词。规则表里的 snake_case 同样约束局部变量，`.clang-tidy` 的 `readability-identifier-naming` 会检查。

## 字符集与保留标识符

- 代码标识符只用 ASCII：字母、数字、下划线。标准允许 Unicode XID 标识符，但工具链、字体与跨平台编辑不一致，Google 同样要求 ASCII。
- 标识符大小写敏感；不要用只差大小写的两个名字区分不同实体。
- 以下名字保留给实现，写了也不保证有诊断：任何位置出现双下划线 `__`；以下划线加大写字母开头；在全局命名空间中以下划线开头。
- 不向 `std` 添加声明；只有在标准允许且依赖用户定义类型时，才特化标准模板（如 `std::formatter`、`std::hash`）。
- 顶层命名空间取项目或团队独有的名字，避免与已有库冲突；不要嵌套 `std`、`absl` 这类知名顶层命名空间。

## 语义角色

| 角色 | 前缀 / 动词 | 例子 | 说明 |
| --- | --- | --- | --- |
| 查询 | `Get` 或访问器风格 | `GetCurrentOrder()`、`CurrentOrder()` | 只读、不改变状态；同一 API 选一种 |
| 判断 | `Is` / `Has` / `Can` | `IsEmpty()`、`HasLine()`、`CanPlace()` | 返回 `bool`，不抛异常；`Is` / `Has` / `Can` 后面写概念名，不逐个念字段（写 `IsEmpty()`，不写 `IsAllFieldsEmpty()`） |
| 查找 | `Find` | `FindTask()` | 找不到是正常结果，返回 `optional`、指针或迭代器，不抛 |
| 计数 | `Count` | `CountMoves()` | 返回数量，不修改状态；`Count` 的对象是集合里的元素 |
| 尝试 | `Try` / 领域动词 | `TryParse()`、`Place()` | 可能因多个前置条件失败但不抛异常，返回 `enum class` 结果；调用方按名区分失败原因。只有一个失败原因、调用方不需要区分时返回 `bool` |
| 确定性动作 | 领域动词 | `CompleteTurn()`、`Reset()` | 前置条件满足时一定成功；无法完成任务时抛 |
| 计算 | 动词开头 | `PreviewWin()` | 从输入算出结果，不修改外部状态 |
| 映射 | `<来源>To<目标>` | `OrderToReceipt()` | 名字必须含两端角色 |
| 读写 | `Read` / `Write` | `ReadEnvironment()`、`WriteLedger()` | 涉及 I/O 时用；不要在库核心用 |
| 访问器 | `Get` + PascalCase，或 snake_case | `GetHistory()`、`history()` | Google 允许两种；同一 API 只选一种，不用成员名直接当函数名 |

- 返回 `bool` 的 lambda 也用 `is_` / `has_` / `can_` 命名：`auto is_empty = [](const Order& order) { ... };`。
- `Find` 不把“没找到”当异常；`Get` 在前置条件不满足时抛标准异常：坐标越界用 `std::out_of_range`，调用时不变量已破坏用 `std::logic_error`；只有调用方必须把这些类型区分开时，才新增派生自它们的类型。两种构建模式的抛出条件相同。两者不要互换。
- 查询返回多个值时用 `struct`，不要用三个 `GetXxx()` 加输出参数。
- 返回集合的查询给只读视图，不把内部容器类型写进接口：`std::span<const Move> GetHistory()`，不写 `const std::vector<Move>&`。视图能被区间的用法遍历，改内部存储不影响调用方；跨度只在对象存活期间有效，写进注释。

- 禁止裸 `To()` / `Of()`：调用点看不出方向。
- 修改器用 `Set` + 属性名（`SetCount()` / `set_count()`）或领域动作（`CompleteTask()`）；同一 API 只选一种，不要用 `SetItem` 这类暴露存储细节的名字。
- `current_` 前缀只在有多个候选、且「当前」可能混淆时使用：`current_order_`。只有一个当前对象时不要加。

## 谓词与查询命名

- 返回 `bool` 的查询用肯定式，读起来像一句断言：`IsEmpty()`、`CanPlace()`、`HasLine()`。
- 前缀集以 `Is` / `Has` / `Can` 为主，外加与成对规则一一对应的 `Completes`、`Would` 这类限定式；`Contains` 只保留给容器成员（`std::vector::empty` 一类已有标准名），不拿它当一般谓词。
- `Get` 只用于取值，`Set` 只用于设值；不要用 `CheckLine()` 当布尔 getter。
- `Check` / `Validate` 留给会报告错误、产生诊断或可能失败的操作，例如 `CheckEnvironment()` 返回问题列表；返回结果类型的校验器也可以用这两个词，只要名字说明它返回结果。它们不做返回纯 `bool` 的查询，bool 查询写在 `Is` / `Has` / `Can` 里。
- 动作可能因为多个前置条件失败、而调用方需要区分原因时，返回 `enum class`（`PlaceResult`、`GameResult`、`WinPreviewResult`），不要用 `bool` 加输出参数，也不要拆成一串 `IsXxx` 判断再重复检查。
- 结果枚举的取值写结果类别，两个词以内：成功用 `kPlaced`；失败按发生原因分别取名（`kEmptySquare`、`kOccupiedSquare`），不合并成一个 `kInvalid`。行尾注释以类别开头，写成「成功：…」「失败：…」，冒号后写这次调用的结果与原因，各行按「落子玩家 → 对局状态 → 写入的值 → 目标方格」的顺序写。完整案例见 `references/naming/examples/naming-state-change.md`。
- 结果枚举的类型用「操作或对象 + Result」，读作「什么的 Result」：`Game::Place` 的结果是 `PlaceResult`，`GetResult` 的结果是 `GameResult`。结果跟随产生它的层：`Board` 只写入，没有结果枚举，也不把 `GameResult` 塞进 `Square` 或 `Board`。
- 同名操作在不同层返回不同结果时，按各自处理的对象取名：`Board::SetSquare` 只写入，没有返回值；`Game::Place` 处理的是一次落子，返回 `PlaceResult`；整局结果由 `Game::GetResult` 另外回答。不把两个答案压进同一个名字，读者才分得清拿到的是「这一手写成了没有」还是「这一局结束了没有」。
- 枚举的取值写成短句，与类型名对齐：`GameResult` 用 `kInProgress`、`kXWin`、`kOWin`、`kDraw`；`SquareValue` 用 `kEmpty`、`kX`、`kO`，行尾写「空」「X」「O」；不写 `kXWins` 这类主谓句，也不掺动作名。
- 词性跟着角色的位置走：前缀 `k` 后面先写角色再写状态，角色作主语、状态作谓语，用不带 `-s` 的动词原形，不用现在分词：`kXWin`、`kOWin`、`kDraw`。谓语读不通时改用名词或形容词，`kInProgress` 是固定说法，`kEmpty` 是形容词。不逐个用 `-ed` 造过去分词（`kXWon`、`kDrawn`），也不写成主谓句 `kXWins`。
- 假设性查询在名字里写明条件：`PreviewWin(pos, square)` 读作「这一次落子会成线吗」，返回 `WinPreviewResult` 区分「不能落子」与「能落但不赢」；只有成功与不报错的纯判断才用 `bool`。同一 API 只选一种，改名时同步声明、定义、调用点、测试和注释。
- 私有谓词同样用肯定式；不要用 `flag`、`status` 或 `check` 这类不说明判据的名字。

## 类型命名的判断顺序

1. 纯数据、无 invariant、可以直接聚合初始化 → `struct`，名字是名词：`Order`, `TaskRecord`。
2. 有 invariant、需要构造函数维持 → `class`，名字是名词：`TaskTable`, `Warehouse`。
3. 封闭的状态集合 → `enum class`，名字是单数名词：`TaskState`, `OrderResult`；枚举子用 `k` 前缀。
   - 类型名用拥有它的那一层的词汇：`PlaceResult` 与 `GameResult` 都在 `Game` 层；`Board` 只做写入，不出现 `Game` 前缀，也不承担终局。反例见 `references/naming/examples/naming-lower-layer.md`。
4. 只有行为、没有状态，且调用方需要替换实现 → 抽象基类；只有一个实现时先用普通类。
5. 一组自由函数 → 命名空间 + 动词；不要为了「像 Java」造一个 `XxxUtil` 类。

## 改名

- 改名是一次独立改动：先搜全部调用点，再改声明、定义、测试和注释。
- 不要把改名和改行为混在一个提交里；改名后测试必须仍然绿色且行为句不变。
- 公共 API 改名视为破坏性变更；需要兼容时保留旧名转发，并在注释里写弃用期限。

## 与 Google、Core Guidelines 的关系

- 本工作流的命名基线是 Google C++ Style：类型与函数 PascalCase，变量 snake_case，常量与枚举子 `k` 前缀。项目内不再另立一套。
- C++ Core Guidelines 的 NL 系列是“没有更好想法时的建议”。NL.10 偏好全 `underscore_style`，与本基线不同；这里采用它的 NL.5（名字不编码类型）、NL.7（名字长度与作用域成比例）、NL.8（风格一致）、NL.9（全大写只给宏）与 NL.19（避免易误读），不整体切换到 `underscore_style`。
- 两者冲突时以本文件的明确规则为准；本文件没写的，按 Google 基线处理。

## 依据

- ISO C++ `[lex.name]`：标识符字符集、大小写敏感与保留标识符。https://eel.is/c++draft/lex.name
- ISO C++ `[namespace.std]`：向 `std` 添加声明与特化的限制。https://eel.is/c++draft/namespace.std
- Google C++ Style Guide, Naming：https://google.github.io/styleguide/cppguide.html#Naming
- C++ Core Guidelines, NL: Naming and layout：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-naming
- `square` / `SquareValue` 的取舍与词义来源见 [square.md](glossary/square.md)。

## 术语

中文术语与英文标识符的对应见 `references/language/glossary/language-terms.md`。代码标识符用英文；注释可以用中文，但同一个概念只用一种译法。
