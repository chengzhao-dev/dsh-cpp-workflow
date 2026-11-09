<!-- 读取时机：命名示例时；读完能回答：正反例：下层类型不要借用上层词汇；预算：一次只开这一份（45 行），不自动串联。 -->
# 正反例：下层类型不要借用上层词汇

**差**：`Board` 定义并返回 `GameResult`。

```cpp
// board.h：棋盘定义了对局结果
enum class GameResult : std::uint8_t {
  kInProgress = 0,
  kXWin = 1,
  kOWin = 2,
  kDraw = 3,
};

class Board {
 public:
  [[nodiscard]] GameResult GetGameResult() const;
};
```

**为什么错**：`Game` 组合 `Board`，调用方向是 `Game -> Board`；`Board` 不知道「一局对局」的生命周期与终局规则，却用 `GameResult` 命名自己的返回值。读者会以为棋盘负责对局状态，`Game` 里再出现同名概念时也无法区分。**下层类型不出现上层类型名。**

**好**：

```cpp
// board.h：棋盘只检查坐标并写入，没有结果类型
class Board {
 public:
  void SetSquare(Position pos, SquareValue value);
};

// game.h：落子结果跟着对局这一个动作走
enum class PlaceResult : std::uint8_t {
  kPlaced = 0,
  kInvalidPlayer = 1,
  kFinishedGame = 2,
  kOccupiedSquare = 3,
};

class Game {
 public:
  [[nodiscard]] PlaceResult Place(Move move);
};
```

`Board` 只写入，没有结果类型，也不出现 `Game` 的词汇；`PlaceResult` 与 `GameResult` 都留在 `Game` 层。下层一旦要回答「这一手成没成」，那已经是上层的问题，交给 `Game::Place`。反例里的 `Board::GetGameResult` 也按同样的方式处理：终局由 `Game::GetResult` 计算。
