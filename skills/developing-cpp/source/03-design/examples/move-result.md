# 正反例：落子结果不能丢，也不要重建一手

**差**：调用方已经拿着一手，`Game` 又用 `GetCurrentPlayer()` 按位置重建一手；`Board::Place` 的 `[[nodiscard]]` 结果还被 `static_cast<void>` 丢掉。重建的玩家与调用方给的不一致时，历史会记下棋盘没有接受的落子。

```cpp
if (!board_.GetCell(move.position).IsEmpty()) {
  return MoveResult::kOccupied;
}
const Move rebuilt{move.position, GetCurrentPlayer()};
static_cast<void>(board_.Place(rebuilt.position, PlayerToCellState(rebuilt.player)));
history_.push_back(rebuilt);
return MoveResult::kPlaced;
```

**好**：`Game::Place` 直接接收一手，先确认是否轮到该玩家，然后判终局，最后交给 `Board::Place`；坐标范围由棋盘检查。按 `Cell::PlaceResult` 分支写历史并换方。`kRejected` 说明棋盘收到了空取值，抛 `std::logic_error`；`kFinished` 仍由 `Game` 判，因为棋盘不知道整局已经结束。

```cpp
Game::MoveResult Game::Place(Move move) {
  // 检查落子玩家是否为当前玩家。玩家不是当前玩家时，抛出 std::logic_error。
  if (move.player != current_player_) {
    throw std::logic_error{"Game::Place: move player is not the current player"};
  }
  // 检查对局是否已经结束。对局已经结束时，返回 kFinished。
  if (board_.GetState() != BoardState::kInProgress) {
    return MoveResult::kFinished;
  }
  switch (board_.Place(move.position, PlayerToCellState(move.player))) {
    case Cell::PlaceResult::kUpdated:
      history_.push_back(move);
      current_player_ = GetOpponent(current_player_);
      return MoveResult::kPlaced;
    case Cell::PlaceResult::kOccupied:
      return MoveResult::kOccupied;
    case Cell::PlaceResult::kRejected:
      throw std::logic_error{"Game::Place: board rejected the move"};
  }
  throw std::logic_error{"Game::Place: unhandled Cell::PlaceResult"};
}
```
