# 正反例：玩家与标记

**差**：

```cpp
Player OtherPlayer(Player player);      // 另一端是谁不明显
CellState CellStateOf(Player player);   // 从什么换到什么没写全
```

**好**：

```cpp
[[nodiscard]] constexpr Player GetOpponent(Player player) noexcept;
[[nodiscard]] constexpr CellState PlayerToCellState(Player player) noexcept;
```

玩家互换用 `GetOpponent`；玩家换成格子状态用 `PlayerToCellState`。查询名与返回类型一致：返回 `Player` 写 `GetCurrentPlayer`，返回 `CellState` 写 `GetCurrentMark`。
