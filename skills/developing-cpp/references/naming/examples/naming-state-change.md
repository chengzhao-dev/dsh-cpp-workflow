# 正反例：状态变更：动作与结果枚举

**差**：

```cpp
enum class PlaceResult : std::uint8_t {
  kPlaced = 0,
  kEmptySquare = 1,
  kOccupiedSquare = 2,
};

class Square {
 public:
  [[nodiscard]] PlaceResult Place(SquareValue value);
  void Clear();
};
```

`Square` 只保存一格的值；`Place` 需要坐标、占用与终局，`Clear` 也要由容器决定。把两者放进单格，等于让值对象承担棋盘规则。

**好**：

```cpp
class Square {
 public:
  [[nodiscard]] bool IsEmpty() const;
  [[nodiscard]] SquareValue GetValue() const;
  void SetValue(SquareValue value) noexcept;
};

class Board {
 public:
  [[nodiscard]] Square GetSquare(Position pos) const;
  void SetSquare(Position pos, SquareValue value);
  void ClearSquare(Position pos);
  void Clear();
};

// game.h：一次落子的结果留在对局层
enum class PlaceResult : std::uint8_t {
  kPlaced = 0,
  kInvalidPlayer = 1,
  kFinishedGame = 2,
  kEmptySquare = 3,
  kOccupiedSquare = 4,
};

class Game {
 public:
  [[nodiscard]] PlaceResult Place(Move move);
};
```

`SetValue` 只改方格的值；`Board::SetSquare` 检查坐标后原样写入，落子成没成由 `Game::Place` 回答。`PlaceResult` 与 `Game::Place` 都留在对局层。`ClearSquare` 清一格，`Clear` 清整盘；单格不再有 `Clear`。

改名按这个顺序做，每一步都能编译：

| 旧名 | 新名 | 理由 |
| --- | --- | --- |
| `Square::Place` | `Square::SetValue` | 单格只做赋值，不承担落子规则 |
| `Square::PlaceResult` | `PlaceResult`（`Game`） | 结果跟随产生它的对象，不留在值对象里 |
| `Square::Clear` | `Board::ClearSquare` | 清空需要棋盘位置，单格只改值 |
| `kEmptyInput` | `kEmptySquare` | 失败值写原因，和其他结果值同一句式 |

`SetValue` 允许写入任意 `SquareValue`，后写覆盖前值。注释也要跟着改名，但不要把「不为空」当状态：

```cpp
///< 失败：方格不为空      // 差
///< 失败：目标方格已有值，没有写入    // 好
```
