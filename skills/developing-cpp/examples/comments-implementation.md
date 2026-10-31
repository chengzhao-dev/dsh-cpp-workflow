# 正反例：实现注释

实现注释只写本层为什么停在这里；声明注释、文件头与配置注释见 `comments-declaration.md`。

## 实现注释

**差**：

```cpp
// 遍历所有空格
for (const auto& position : empty_cells) {
  // 尝试落子
  const bool wins = game.PreviewWin(position, cell_type) == WinPreviewResult::kWouldWin;
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
Cell::PlaceResult Cell::Place(CellState state) {
  // 传入状态为 kEmpty，不更新格子状态。
  if (state == CellState::kEmpty) {
    return PlaceResult::kEmptyState;
  }

  // 格子已有状态，不进行覆盖。
  if (state_ != CellState::kEmpty) {
    return PlaceResult::kOccupied;
  }

  // 格子状态为空，更新为传入的状态。
  state_ = state;
  return PlaceResult::kPlaced;
}
```

每一支的上一行一句，写这一支的后果；`//` 里的枚举值不包反引号。空行与注释的边界：

- 多条独立拒绝：每个 `if` 上一行一句，写拒绝后棋盘怎样。
- 成功写入：上一行一句，写为什么到这里才改棋盘。
- 次序依赖的一对 `if`：第一组上方一句说明次序不能反，第二个不复制。
- 循环上方已有阶段说明时，循环里的 `if` 不再加；单表达式谓词不加。

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
