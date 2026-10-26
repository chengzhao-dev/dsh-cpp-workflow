# 正反例：实现注释

实现注释只写本层为什么停在这里；声明注释、文件头与配置注释见 `comments-declaration.md`。

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
