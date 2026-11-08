# 正反例：实现注释

实现注释只写本层为什么停在这里；声明注释、文件头与配置注释见 `references/comments/examples/` 里的 `declaration-file.md`、`declaration-class.md` 等案例。

**差**：

```cpp
// 遍历所有空格
for (const auto& pos : empty_squares) {
  // 尝试落子
  const bool wins = game.PreviewWin(pos, state) == WinPreviewResult::kWouldWin;
  // 如果能赢
  if (wins) {
    // 返回这次落子的位置
    return pos;
  }
}
```

每行都在复述代码。

**好**：

```cpp
PlaceResult Game::Place(Move move) {
  // 检查对局是否仍在进行。
  if (GetResult() != GameResult::kInProgress) {
    return PlaceResult::kFinishedGame;
  }

  // 检查落子玩家是否为当前玩家。
  if (current_player_ != move.player) {
    return PlaceResult::kInvalidPlayer;
  }

  // 检查要写入的值是否为空。
  const SquareValue target_square_value = PlayerToSquareValue(move.player);
  if (target_square_value == SquareValue::kEmpty) {
    return PlaceResult::kEmptySquare;
  }

  // 检查目标方格是否为空。
  const Square target_square = board_.GetSquare(move.position);
  if (!target_square.IsEmpty()) {
    return PlaceResult::kOccupiedSquare;
  }

  current_player_ = PlayerToOpponent(current_player_);
  board_.SetSquare(move.position, target_square_value);
  history_.push_back(move);
  return PlaceResult::kPlaced;
}
```

每一条拒绝各写一条独立 `if`，在判定处用一句「检查…是否…」写这一支在检查什么；结果由分支里的 `return` 表达，不再复述「没有写入」「按失败返回」。局部值由上一行赋值取出、赋值与上一个阶段之间又有空行时，注释写在赋值那一行上方，说明赋值与紧随其后的分支这整块，`if` 上不再重复。`//` 里的枚举值不包反引号。分支的完整规则见 `references/comments/comment-rules.md` 的「实现」节。

**好（多条件）**：

```cpp
std::array<SquareValue, 3> values{};
for (std::size_t i = 0; i < line.size(); ++i) {
  values[i] = board_.GetSquare(line[i]).GetValue();
}
// 检查第一个方格是否有值，再核对三个方格的取值是否相同。
if (values[0] != SquareValue::kEmpty && values[0] == values[1] && values[1] == values[2]) {
  return values[0] == SquareValue::kX ? GameResult::kXWin : GameResult::kOWin;
}
```

多条件判断按代码的判定顺序写：先确认的条件在前，后核对的在后；结果由分支里的 `return` 表达，不在注释里重复。三个同类取值存进 `values` 数组并按下标读取，不写 `value0`、`value1`、`value2`。

**好（成功路径）**：

```cpp
// 落子成功，记录这一步并轮到对方。
history_.push_back(move);
current_player_ = PlayerToOpponent(current_player_);
return GetResult();
```

成功路径有多步状态更新时，用一句阶段注释概括整段；不在每一步上方逐行解释 `push_back` 与赋值。
