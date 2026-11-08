# 正反例：推演一步读原数据

**差**：先复制整个棋盘，再用 `SetSquare` 改副本。`SetSquare` 后写覆盖前值，也不报告目标方格原本有没有值，副本上的「落子」看不出这一格本来已有棋子；越界时它抛异常，预览的失败又多出一种形态。

```cpp
Board hypothetical = *this;
hypothetical.SetSquare(pos, value);
return hypothetical.HasLine(value) ? WinPreviewResult::kWouldWin : WinPreviewResult::kWouldNotWin;
```

**好**：判断「这一格换成某种棋子后会不会成线」不需要第二份棋盘。越界与占用是预览自己要先拒绝的条件，放在最前并返回原因；通过之后只在包含该坐标的线上把这一格算作 `value`，其余方格读原棋盘。

```cpp
WinPreviewResult Board::PreviewWin(Position pos, SquareValue value) const {
  if (!IsInRange(pos) || !GetSquare(pos).IsEmpty()) {
    return WinPreviewResult::kInvalidPlace;
  }

  const auto matches = [&](Position cell) {
    if (cell.row == pos.row && cell.col == pos.col) {
      return true;
    }
    return squares_.at(cell.row).at(cell.col) == value;
  };

  const bool completes = std::ranges::any_of(kLines, [&](const auto& line) {
    const bool contains = std::ranges::find_if(line, [&](Position cell) {
                            return cell.row == pos.row && cell.col == pos.col;
                          }) != line.end();
    return contains && std::ranges::all_of(line, matches);
  });
  return completes ? WinPreviewResult::kWouldWin : WinPreviewResult::kWouldNotWin;
}
```

先用 `IsInRange` 拒绝越界，再读取方格：越界在触碰数组之前被拒绝，`GetSquare` 实际不会抛，函数内没有抛出点，可以标 `noexcept`。`SetSquare` 不能拿来试落，因为它只管写入，不回答这一格能不能落。
