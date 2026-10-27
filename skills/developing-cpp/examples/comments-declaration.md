# 正反例：声明注释与文件头

## 文件头

**差**：

```cpp
// board.h
// 作者：chengzhao-dev
// 创建：2026-01-01
// 修改：2026-03-02 增加 CompletesLine
```

**好**：

```cpp
/// @file board.h
/// @brief 定义井字棋棋盘、格子坐标与格子类型。
///
/// 棋盘保存九个棋盘格子的状态，提供只读查询、落子与清空棋盘。
```

文件头只介绍这个文件里有什么，不写作者和变更史，也不把读者指去另一个文件。

## 类型注释：概念与约定，不是功能清单

**差**：

```cpp
/// 井字棋棋盘。
///
/// 提供检查坐标区间、检查棋盘格子是否为空、获取棋盘格子类型、放置棋子、清空棋盘和判定终局的功能。
/// 棋盘为 3 行 3 列。
class Board {
```

问题有两处：把成员函数抄了一遍，接口一改就过期；「棋盘为 3 行 3 列」被拆成单独一句，读者不知道它在回答什么问题。

**差**（把别的类型和以后才发生的事都写进来）：

```cpp
/// 井字棋棋盘。
///
/// 棋盘只保存 3×3 的格子状态和规则判断，不含回合推进：谁该落子、落子被拒后怎么提示留在 Game。
///
/// 棋盘是值语义，可以自由拷贝；所有查询都是 const，对局和搜索可以交替读取同一棋盘。
class Board {
```

第二段说的是 `Game` 负责什么，读者读完仍不知道 `Board` 是什么，重构一次这句话就过期；后两段里的可拷贝、`const` 查询在类声明里已经写清，「搜索要读同一棋盘」还不是现在的调用方。读者真正需要的是这个类型是什么；格子数由成员声明表达，失败方式写在各自函数上。

**好**（纯数据与尺寸由成员表达）：

```cpp
/// 井字棋棋盘。
class Board {
```

**好**（类有不变量，第二句才写限制）：

```cpp
/// 一局井字棋。
///
/// 棋盘、当前玩家和落子历史同步推进；落子被拒时三者都不变。
class Game {
```

纯数据结构和枚举只写一句名词短语；类有不变量，且第二句不是重复 `cells_`、`kBoardRows` 这类领域尺寸时，才保留第二段。函数各自的契约下沉到函数注释，设计理由与分层写进书稿。

## 构造函数与析构函数：标签 + 职责

**差**：

```cpp
/// 构造函数：创建一个空棋盘。
Board() = default;
```

「创建」复述了声明，读者仍不知道构造完成后棋盘里是什么、`cells_` 的每个元素是否已经有值。

**好**：

```cpp
/// 默认构造函数：得到空棋盘，每个格子都是 kEmpty。
Board() = default;

/// 析构函数：保证通过接口指针正确删除派生类对象。
virtual ~Ai();
```

`= default` 本身不说明成员被初始化成什么；`cells_{}` 把每个 `CellType` 初始化成 `kEmpty`，这条后置条件从签名上看不出来。标签说明这是哪一类特殊成员，冒号后写它建立的状态或承担的职责。

## 风格理由不进注释

**差**（在十几个函数上各写一遍）：

```cpp
/// 检查坐标是否在范围内。函数名用 UpperCamel 而不是 snake_case，与标准库区分。
[[nodiscard]] static bool IsInRange(CellPosition position) noexcept;

/// 检查格子是否为空。函数名用 UpperCamel 而不是 snake_case，与标准库区分。
[[nodiscard]] bool IsCellEmpty(CellPosition position) const;
```

**好**（只写契约）：

```cpp
/// 检查坐标是否落在棋盘下标区间内。
///
/// 只判断几何边界，不检查格子是否为空、对局是否已经结束。
[[nodiscard]] static bool IsInRange(CellPosition position) noexcept;
```

命名与风格约定写进项目文档和读者正文，注释里不解释「为什么用这种命名」。

## 第一句：结果、限制或检查项

**差**：

```cpp
/// 检查坐标。
/// 返回格子类型；越界会抛异常。
CellType GetCellType(CellPosition position) const;
```

前两句都没有直接回答“合法时拿到什么、越界时发生什么”，读者要读完三句才拼出合同。

**好**：

```cpp
/// 坐标越界时抛出 std::out_of_range；合法坐标返回该格类型。
///
/// @param position 行列坐标。
/// @throws std::out_of_range 坐标不在棋盘范围内。
CellType GetCellType(CellPosition position) const;
```

第一句就是结果、失败方式或检查项；后面的标签只补参数与异常细节，不再重复这句话。

**差**（比较函数却先写“比较”）：

```cpp
/// 比较两个坐标。
friend bool operator==(const CellPosition&, const CellPosition&) = default;
```

**好**：

```cpp
/// 检查两个坐标的行与列是否都相同。
friend bool operator==(const CellPosition&, const CellPosition&) = default;
```

布尔查询和 `operator==` 的第一句都用「检查…是否…」，让读者先看到被检查的条件，而不是一个同义反复的动词。

## 函数契约

**差**：

```cpp
/// 尝试执行一次落子。
///
/// @param move 落子。
/// @returns 落子执行成功返回 kPlaced，被拒绝返回 kRejected。
[[nodiscard]] PlaceResult TryPlace(const Move& move);
```

`@param move 落子` 是把类型名翻译成中文，没有信息；`@returns` 不是 Doxygen 标签；没有说被拒绝的条件，调用方只能读实现。

**好**：

```cpp
/// 尝试执行一次落子。
///
/// 只有本局仍在进行、且落子玩家正是当前玩家时才继续，棋盘、轮次、历史三者一起更新。
///
/// @param move 待执行的落子，玩家必须是当前轮到的玩家。
/// @return 落子写入棋盘并换手时返回 kPlaced；对局已结束或上述任一条件不满足时返回 kRejected，
///         棋盘和轮次都不变。
[[nodiscard]] PlaceResult TryPlace(const Move& move);
```

## 布尔查询要写「不检查什么」

**差**：

```cpp
/// 检查指定坐标上的棋盘格子是否为空。
[[nodiscard]] bool IsCellEmpty(CellPosition position) const;
```

**好**：

```cpp
/// 检查指定坐标上的棋盘格子是否为空。
///
/// 只回答「这一格能不能落子」，不判断对局是否已经结束：对局结束后格子仍是空的，
/// 但再落子没有意义。是否需要先看对局状态由调用方决定，棋盘不替它下结论。
///
/// @param position 待检查的坐标。
/// @return 坐标在棋盘内且该格为空时返回 true；越界或该格已有棋子时返回 false。
[[nodiscard]] bool IsCellEmpty(CellPosition position) const;
```

布尔函数最容易被误用；把「不检查什么」写出来，比多写一个参数说明有用。

## 枚举

**差**：

```cpp
enum class Player : std::uint8_t {
  kCross,  // X
  kNought  // O
};
```

**好**：

```cpp
/// 对局结果。
enum class GameResult : std::uint8_t {
  kInProgress = 0,  ///< 游戏进行中：还可以落子。
  kCrossWin = 1,    ///< X 获胜：达成三连。
  kNoughtWin = 2,   ///< O 获胜：达成三连。
  kDraw = 3,        ///< 平局：棋盘已满，双方都没有三连。
};
```

行尾注释先写语义，需要时用冒号补一句能核实的条件或结果，两段都短；不重复名字，不写嵌套子句，同一枚举要么全写要么全不写。

## 数据成员

**差**：

```cpp
Board board_;  // 对局棋盘。
std::array<std::array<CellType, kBoardCols>, kBoardRows> cells_{};  // 存储棋盘格子。
```

前一句把名字翻译了一遍；后一句只复述声明，没有说清两层下标各是什么。

**好**：

```cpp
/// 棋盘格子数组：外层下标是行，内层下标是列。
std::array<std::array<CellType, kBoardCols>, kBoardRows> cells_{};
/// 当前玩家：开局由 X 先手。
Player current_player_ = Player::kCross;
/// 对局结果：落子被拒时保持原值。
GameResult result_ = GameResult::kInProgress;
/// 落子历史：按落子次序保存。
std::vector<Move> history_;
```

主注释写在声明上一行，类数据成员（含私有）统一用 `///`；第一句先说是哪个成员，再用全角冒号补名字和类型看不出的范围、初值含义、轴向、哨兵与改写时机。行尾不写补充；`///<` 只给枚举项和 `struct` 短字段。名字已经说明存放对象的 `board_` 不写「对局棋盘」。

## 完整声明：后置条件与轴向

把上面的规则放在一起，`Board` 的声明是这样：

```cpp
/// 井字棋棋盘。
class Board {
 public:
  /// 默认构造函数：得到空棋盘，每个格子都是 kEmpty。
  Board() = default;

 private:
  /// 棋盘格子数组：外层下标是行，内层下标是列。
  std::array<std::array<CellType, kBoardCols>, kBoardRows> cells_{};
};
```

类注释只说这个类型是什么；构造注释补的是 `= default` 配合 `cells_{}` 才建立的后置条件；`cells_` 的上一行先说是棋盘格子数组，再用全角冒号补轴向。行尾不写补充；`{}` 带来的空格子已经由构造注释表达。三处各说一件事，没有一句复述签名。

## 配置注释

**差**：

```yaml
# 这是 clang-format 配置
# 详见某文档
ColumnLimit: 100
```

**好**：

```yaml
# 列宽、缩进、包含顺序都取 Google 预设，不逐项覆盖。
Language: Cpp
BasedOnStyle: Google
Standard: Latest
```

解释为什么选预设，不写策略头，不指文档路径。

## 不该进注释的东西

**差**：

```cpp
// 2026-03-02 把 Board 从 Game 里拆出来，因为之前 Game 太长。
// 参见 https://example.com/2026/03/02/refactor
// 其余成员见下方注释，两处不重复。
// 本团队要求所有类注释写满五行。
```

**好**：

```cpp
/// @file board.h
/// @brief 棋盘状态与规则判断。
///
/// 定义 Board 的查询、落子与清空棋盘。
```

变更史进提交说明，外部资料进文档，团队流程进规范文件；注释只写这个文件或这个类型自己的内容，不把读者指去别的文件。
