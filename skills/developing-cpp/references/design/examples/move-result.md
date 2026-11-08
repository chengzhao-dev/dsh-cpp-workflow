# 正反例：落子结果用返回值回答

**差**：`Game::Place` 返回整局结果，一次落子的失败只能挤进异常。调用方要写 `try/catch` 才能提示「方格已被占用」，终局与非法玩家只能从消息文本里猜；想区分失败就得解析字符串。这一手成没成与整局如何是两件事，混在一个返回值里，调用方每步还要再问一次 `GetResult()`。

```cpp
GameResult Game::Place(Move move) {
  if (!board_.GetSquare(move.position).IsEmpty()) {
    throw std::logic_error{"Game::Place: board rejected an occupied square"};
  }
  board_.SetSquare(move.position, PlayerToSquareValue(move.player));
  history_.push_back(move);
  current_player_ = PlayerToOpponent(current_player_);
  return GetResult();
}
```

**好**：`Game::Place` 返回 `PlaceResult`，五个取值各答一条规则：`kPlaced` 说这一手写成，`kInvalidPlayer`、`kFinishedGame`、`kEmptySquare` 与 `kOccupiedSquare` 各说一条拒绝的规则。调用方按值分支，不解析消息；整局结果仍由 `GetResult()` 单独回答。棋盘写入由 `Board::SetSquare` 完成，它只检查坐标，不报告占用，因此占用必须在写入前判断。多个拒绝分支各自写成一条 `if`，检查不通过就返回；成功路径落在函数末尾，不串 `else if`。

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
