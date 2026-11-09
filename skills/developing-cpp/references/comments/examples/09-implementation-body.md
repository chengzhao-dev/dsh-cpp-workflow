<!-- 读取时机：写或改注释的示例时；读完能回答：正反例：实现注释；预算：一次只开这一份（94 行），不自动串联。 -->
# 正反例：实现注释

实现注释只写本层为什么停在这里；声明注释、文件头与配置注释见 `references/comments/examples/` 里的 `04-declaration-file.md`、`01-declaration-class.md` 等案例。

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
  // 先判终局，再判玩家与方格：失败结果的优先级由此决定。
  if (!IsInProgress()) {
    return PlaceResult::kFinishedGame;
  }

  if (current_player_ != move.player) {
    return PlaceResult::kInvalidPlayer;
  }

  const SquareValue target_square_value = PlayerToSquareValue(move.player);
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

每一条拒绝各写一条独立 `if`；分支结果由 `return` 表达，不再写与 `if` 同义的「检查…是否…」。只有失败结果的优先级需要说明时，在第一条 `if` 上方写一句总起；没有真实防御分支时不硬加。局部值由上一行赋值取出、赋值与上一个阶段之间又有空行时，注释写在赋值那一行上方，说明赋值与紧随其后的分支这整块，`if` 上不再重复。`//` 里的枚举值不包反引号。分支的完整规则见 `references/comments/01-comment-rules.md` 的「实现」节。

**好（多条件）**：

```cpp
std::array<SquareValue, 3> values{};
for (std::size_t i = 0; i < line.size(); ++i) {
  values[i] = board_.GetSquare(line[i]).GetValue();
}
// 先确认第一个方格有值，再核对三个方格的取值是否相同。
if (values[0] != SquareValue::kEmpty && values[0] == values[1] && values[1] == values[2]) {
  return values[0] == SquareValue::kX ? GameResult::kXWin : GameResult::kOWin;
}
```

多条件判断按代码的判定顺序写：先确认的条件在前，后核对的在后；结果由分支里的 `return` 表达，不在注释里重复。三个同类取值存进 `values` 数组并按下标读取，不写 `value0`、`value1`、`value2`。

**好（成功路径）**：

```cpp
// 写盘并记录这一步，然后轮到对方。
current_player_ = PlayerToOpponent(current_player_);
board_.SetSquare(move.position, target_square_value);
history_.push_back(move);
return PlaceResult::kPlaced;
```

成功路径有多步状态更新时，用一句阶段注释概括整段；不在每一步上方逐行解释 `push_back` 与赋值。

## 从函数体注释到函数头注释

函数体里的「检查…是否…」不再写；如果这句话确实是函数头的契约，把条件写成声明注释的「主体是否状态」和 `@return`，实现里只留 `return`、`throw` 或赋值。

## 只在 .cpp 出现的函数

```cpp
/// 把输入流读到一行。
///
/// @param in 输入流。
/// @param line 读到的行。
/// @return 读到内容时返回 true；流结束返回 false。
bool ReadLine(std::istream& in, std::string& line) {
  return static_cast<bool>(std::getline(in, line));
}
```

头文件里已经声明的函数，定义处不再写 `///`；契约留在声明处。只在 `.cpp` 出现、且有参数或返回值的函数，定义上一行写完整契约。
