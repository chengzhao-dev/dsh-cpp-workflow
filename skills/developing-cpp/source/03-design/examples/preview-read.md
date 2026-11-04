# 正反例：推演一步读原数据

**差**：先复制整个棋盘，再在副本上落子，最后判断成线；调用方看不出副本只是中间量，还要重复处理落子失败。

```cpp
Board hypothetical = *this;
const Cell::PlaceResult placed = hypothetical.Place(pos, state);
if (placed != Cell::PlaceResult::kUpdated) {
  return WinPreviewResult::kInvalidPlace;
}
return hypothetical.HasLine(state) ? WinPreviewResult::kWouldWin
                                       : WinPreviewResult::kWouldNotWin;
```

**好**：判断「这一格换成某种棋子后会不会成线」不需要第二份棋盘。越界、空格、已占用交给 `CheckPlaceable` 统一返回原因；通过之后只在包含该坐标的线上把这一格算作 `state`，其余格子读原棋盘。

```cpp
WinPreviewResult Board::PreviewWin(Position pos, CellState state) const {
  if (CheckPlaceable(pos, state) != Cell::PlaceResult::kUpdated) {
    return WinPreviewResult::kInvalidPlace;
  }

  const auto matches = [&](Position cell) {
    if (cell.row == pos.row && cell.col == pos.col) {
      return true;
    }
    return cells_.at(cell.row).at(cell.col) == state;
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

先用 `IsInRange` 拒绝越界，再用 `at()` 读取；失败路径不碰数组，`noexcept` 也就不再成立。
