# 正反例：数据成员

**差**：

```cpp
Board board_;  // 对局棋盘。
std::array<std::array<CellState, kColumnCount>, kRowCount> cells_{};  // 存储棋盘格子。
```

前一句把名字翻译了一遍；后一句只复述声明，没有说清两层下标各是什么。

**好**：

```cpp
/// 棋盘格子数组：外层下标是行，内层下标是列。
std::array<std::array<CellState, kColumnCount>, kRowCount> cells_{};
/// 当前玩家：开局由 X 先手。
Player current_player_ = Player::kCross;
/// 棋盘状态：落子被拒时保持原值。
BoardState state_ = BoardState::kInProgress;
/// 落子历史：按落子次序保存。
std::vector<Move> history_;
```

主注释写在声明上一行，类数据成员（含私有）统一用 `///`；第一句先说是哪个成员，再用全角冒号补名字和类型看不出、只属于该成员的范围、轴向、哨兵与所有权。类级初值与状态迁移写在类注释，成员注释不重复。行尾不写补充；`///<` 只给枚举项和 `struct` 短字段。名字已经说明存放对象的 `board_` 不写「对局棋盘」。
