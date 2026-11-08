# 正反例：枚举

**差**：

```cpp
enum class SquareValue : std::uint8_t {
  kX,  // X
  kO   // O
};
```

**好（状态枚举）**：

```cpp
/// 对局结果。
enum class GameResult : std::uint8_t {
  kInProgress = 0,  ///< 对局进行中，还有空格可以落子
  kXWin       = 1,  ///< 棋盘上 X 已连成一线，X 赢下这一局
  kOWin       = 2,  ///< 棋盘上 O 已连成一线，O 赢下这一局
  kDraw       = 3,  ///< 棋盘已满且无人连成一线，这一局平局
};
```

**好（取值枚举）**：

```cpp
/// 方格的值：棋盘上每个方格要么空着，要么写着 X 或 O。
enum class SquareValue : std::uint8_t {
  kEmpty = 0,  ///< 空
  kX = 1,      ///< X
  kO = 2,      ///< O
};
```

**好（结果枚举）**：

```cpp
/// 一次落子的结果。
enum class PlaceResult : std::uint8_t {
  kPlaced = 0,          ///< 成功：落子玩家是当前玩家，值已写入方格
  kInvalidPlayer = 1,   ///< 失败：落子玩家不是当前玩家，没有写入
  kFinishedGame = 2,    ///< 失败：对局已经结束，没有写入
  kEmptySquare = 3,     ///< 失败：要写入的值是 kEmpty，没有写入
  kOccupiedSquare = 4,  ///< 失败：目标方格已有值，没有写入
};
```

行尾注释写完整的状态；结果行写「结果类别：结果与原因」，冒号前后都不能空，冒号后按固定顺序写「落子玩家 → 对局状态 → 写入的值 → 目标方格」，某一项不适用时省略。类型注释交代了共同后果（如「没有写入」）时，不逐项重复。不写「X 成线」「尚未结束」这种只有谓语的片段；同一枚举要么全写要么全不写。
