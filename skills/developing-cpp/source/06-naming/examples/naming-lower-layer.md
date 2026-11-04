# 正反例：下层类型不要借用上层词汇

**差**：`Board` 定义并返回 `GameResult`。

```cpp
// board.h：棋盘定义了对局结果
enum class GameResult : std::uint8_t {
  kInProgress = 0,
  kXWins = 1,
  kOWins = 2,
  kDraw = 3,
};

class Board {
 public:
  [[nodiscard]] GameResult GetGameResult() const;
};
```

**为什么错**：`Game` 组合 `Board`，调用方向是 `Game -> Board`；`Board` 不知道「一局对局」的生命周期，却用 `GameResult` 命名自己的返回值。读者会以为棋盘负责对局状态，`Game` 里再出现同名概念时也无法区分。**下层类型不出现上层类型名。**

**好**：

```cpp
// board.h：棋盘只回答棋盘自己的状态
enum class BoardState : std::uint8_t {
  kInProgress = 0,
  kXWins = 1,
  kOWins = 2,
  kDraw = 3,
};

class Board {
 public:
  [[nodiscard]] BoardState GetState() const;
};
```

`Board` 的返回值用 `BoardState`；`Game` 需要「对局结果」时在 `Game` 层组合或另起名字，不把 `Game` 的词汇塞进 `Board`。`GameResult`、`GameState`、`PlayerMove` 这类「上层前缀 + 下层类型」都按反例处理。
