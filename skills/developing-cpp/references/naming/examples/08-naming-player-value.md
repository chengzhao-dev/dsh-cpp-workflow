<!-- 读取时机：命名示例时；读完能回答：正反例：玩家与方格的值；预算：一次只开这一份（15 行），不自动串联。 -->
# 正反例：玩家与方格的值

**差**：

```cpp
Player Opponent(Player player);         // 缺动词，也看不出换的是什么
```

**好**：

```cpp
[[nodiscard]] constexpr Player PlayerToOpponent(Player player) noexcept;
```

自由函数用 `来源To结果` 加返回值类型：玩家换方是 `PlayerToOpponent`，玩家变成方格的值是 `PlayerToSquareValue`，不写 `SquareValueOf`。`Get` 留给类里的成员查询，如直接返回成员的 `GetCurrentPlayer`。`To` 后面先写结果类型再写角色，所以 `PlayerToOpponent` 不再重复 `Player`。
