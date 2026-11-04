# 正反例：实现注释

实现注释只写本层为什么停在这里；声明注释、文件头与配置注释见 `source/07-comments/examples/` 里的 `declaration-file.md`、`declaration-class.md` 等案例。

**差**：

```cpp
// 遍历所有空格
for (const auto& pos : empty_cells) {
  // 尝试落子
  const bool wins = game.PreviewWin(pos, state) == WinPreviewResult::kWouldWin;
  // 如果能赢
  if (wins) {
    // 返回这次落子的位置
    return pos;
  }
}
```

每行都在复述代码。

**好**：

```cpp
Cell::PlaceResult Cell::Place(CellState state) {
  // 检查传入状态是否为空。传入状态为空时，格子保持原状态。
  if (state == CellState::kEmpty) {
    return PlaceResult::kRejected;
  }

  // 检查格子是否为空。格子是 X 或 O 时，保持原状态。
  if (state_ != CellState::kEmpty) {
    return PlaceResult::kOccupied;
  }

  // 检查格子是否为空。格子为空时，更新为传入状态。
  state_ = state;
  return PlaceResult::kUpdated;
}
```

每一支的上一行两句：第一句写检查什么，第二句写条件成立后的结果；第二句的主语不能省到读不出。`//` 里的枚举值不包反引号。分支的完整规则见 `source/07-comments/01-comment-rules.md` 的「实现」节。
