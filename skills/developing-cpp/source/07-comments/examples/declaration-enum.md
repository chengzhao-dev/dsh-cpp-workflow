# 正反例：枚举

**差**：

```cpp
enum class Player : std::uint8_t {
  kCross,  // X
  kNought  // O
};
```

**好**：

```cpp
/// 棋盘状态。
enum class BoardState : std::uint8_t {
  kInProgress = 0,  ///< 棋盘尚未分出胜负
  kXWins = 1,       ///< 棋盘上 X 已连成一线
  kOWins = 2,       ///< 棋盘上 O 已连成一线
  kDraw = 3,        ///< 棋盘已满且无人连成一线
};
```

行尾注释必须以枚举主体的同一个词开头，写成完整的状态或结果；需要补原因时用「主体 + 结果：原因」，冒号前后都不能空。不写「X 成线」「尚未结束」这种只有谓语的片段，同一枚举要么全写要么全不写。
