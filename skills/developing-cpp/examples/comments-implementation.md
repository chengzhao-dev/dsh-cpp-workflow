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
// 先找能立刻赢的格子：启发式只在「马上赢」和「马上挡」之间做选择，
// 不在这里做更深的前瞻，深搜留给 MinimaxAi。
for (const auto& position : empty_cells) {
  if (game.PreviewWin(position, CellType::kX) == WinPreviewResult::kWouldWin) {
    return position;
  }
}

// 没有必胜格，交给下一层策略；这里不猜后续几步。
return std::nullopt;
```

空行分开的阶段各一句，写这一阶段为什么停在这里。空行与注释的边界：

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
