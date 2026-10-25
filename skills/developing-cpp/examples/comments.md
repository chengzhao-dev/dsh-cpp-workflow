# 正反例：注释

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
//===----------------------------------------------------------------------===//
// board.h - 定义井字棋棋盘。
//
// 棋盘只保存格子状态与规则判断，不含对局流程；对局流程在 game.h。
//===----------------------------------------------------------------------===//
```

文件头回答「这个文件负责什么、不负责什么」，不写作者和变更史。后两行是这条边界：读的人由此知道该去哪个文件找回合推进。

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

第二段说的是 `Game` 负责什么，读者读完仍不知道 `Board` 保证什么，重构一次这句话就过期；后两段里的可拷贝、`const` 查询在类声明里已经写清，「搜索要读同一棋盘」还不是现在的调用方。读者真正需要的是这个类型自己的不变量与失败方式。

**好**：

```cpp
/// 井字棋棋盘。
///
/// 3×3 个格子，每格取空、X 或 O；越界坐标不会写入棋盘。
class Board {
```

两句都是本类型能兑现、读代码又不容易一眼看全的事，函数各自的契约下沉到函数注释；设计理由与分层不写进注释，写进书稿。

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

## 第一句：先写结果或限制

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

第一句就是结果或失败方式；后面的标签只补参数与异常细节，不再重复这句话。

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
Board board_;
Player current_player_;
GameResult result_;
```

**好**：

```cpp
Board board_;                             // 对局棋盘。
Player current_player_ = Player::kCross;  // 当前轮到的玩家，开局时 X 先手。
GameResult result_ = GameResult::kInProgress;  // 对局结果；落子被拒时不改写。
```

行尾写「存什么 + 初值含义 + 什么时候变」，同类成员对齐。

## 实现注释

**差**：

```cpp
// 遍历所有空格
for (const auto& position : empty_cells) {
  // 尝试落子
  const bool wins = game.Board().CompletesLine(position, cell_type);
  // 如果能赢
  if (wins) {
    // 返回这一手
    return position;
  }
}
```

每行都在复述代码。

**好**：

```cpp
// 先找能立刻赢的格子：启发式只在「马上赢」和「马上挡」之间做选择，
// 不在这里做更深的前瞻，深搜留给 MinimaxAi。
for (const auto& position : empty_cells) {
  if (game.CompletesLine(position, CellType::kX)) {
    return position;
  }
}
```

解释「为什么停在这一层」，不翻译语句。

## TODO

**差**：

```cpp
// TODO: 参考 xxx
// FIXME: 这里可能有问题
```

**好**：

```cpp
// TODO: 阶段 5 - 给 MinimaxAi 加置换表，减少重复局面的搜索。
```

有定位、有动作、能搜索。

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
//===----------------------------------------------------------------------===//
// board.h - 棋盘状态与规则判断
//
// 这一层只有格子状态和胜负判定；回合推进在 game.h，输入输出在 apps/。
//===----------------------------------------------------------------------===//
```

变更史进提交说明，外部资料进文档，团队流程进规范文件，跨文件的边界写文件头；类注释只写本类型自己的契约。
