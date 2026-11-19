<!-- 读取时机：看设计案例时；读完能回答：正反例：推演一步读原数据；预算：一次只开这一份（36 行），不自动串联。 -->
# 正反例：推演一步读原数据

**差**：先复制整个棋盘，再用 `SetSquare` 改副本。`SetSquare` 后写覆盖前值，也不报告目标方格原本有没有值，副本上的「落子」看不出这一格本来已有棋子；越界时它抛异常，预览的失败又多出一种形态。

```cpp
Board hypothetical = *this;
hypothetical.SetSquare(pos, value);
return hypothetical.HasLine(value) ? WinPreviewResult::kWouldWin : WinPreviewResult::kWouldNotWin;
```

**好**：判断「这一格换成某种棋子后会不会成线」不需要第二份棋盘。下面是目标态示例，工程当前没有 `PreviewWin`；要实现预览查询时按此写法。占用是预览自己要先拒绝的条件，放在最前并返回原因；越界由棋盘抛出，预览不自己判。通过之后只在包含该坐标的线上把这一格算作 `value`，其余方格读原棋盘。

```cpp
WinPreviewResult Board::PreviewWin(Position pos, SquareValue value) const {
    if (!GetSquare(pos).IsEmpty()) {
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

先读方格：越界时 `GetSquare` 抛出 `std::out_of_range`，占用时返回 `kInvalidPlace`；预览不把越界改写成结果值，也不自己复制范围判断。它返回结果枚举，按 `references/exceptions/01-exception-rules.md` 的「不抛的边界」不因为函数体不抛就补 `noexcept`。`SetSquare` 不能拿来试落，因为它只管写入，不回答这一格能不能落。
