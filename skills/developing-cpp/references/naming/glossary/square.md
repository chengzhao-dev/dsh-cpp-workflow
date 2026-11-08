# square 与 SquareValue

本文件是 `references/naming/identifier-names.md` 的附录，只讨论 `square` / `SquareValue` 这个词的写法；词表与加词流程见 [naming-terms.md](naming-terms.md)。

`Square` 是棋盘上的一格，中文「方格」；格中的内容写 `SquareValue`，中文「方格的值」。不用 `Mark`、`Cell`、`Token`。

| 语义 | 写法 | 依据 |
| --- | --- | --- |
| 棋盘上的一格 | `Square`；参数、局部变量 `square`；查询 `GetSquare` / `SetSquare` | CPW `Squares`、Stockfish `enum Square`、chess.hpp `Square`、python-chess `chess.Square`；有道 `square`「（棋盘上的）方格」；汉典、海词「方格=方形的格子」 |
| 格中的内容 | `SquareValue`；查询/写入 `GetValue` / `SetValue`；取值 `kEmpty` / `kX` / `kO` | LucHermitte `enum class SquareValue` 与 `Square::value()`；tictacrustle `SquareValue` / `set_value`；React 井字棋 `value`；海词、必应、有道、汉典 `value=值/数值` |
| 玩家→格中内容 | `PlayerToSquareValue` | 本项目 `move.h`；`identifier-names.md` 的「来源To结果」 |
| 一条线的三个值 | `line_values` | 本项目 `game.cpp`；容器用复数 |
| 目标方格的值 | `target_square_value` | 本项目 `game.cpp`；角色写进名字 |
| 避免 | `Mark`、`Cell`、`Token` | 井字棋英文常用 `mark`（Exploratorium「marks in empty squares」），但 `Value` 在 Stockfish 是搜索分值、中文项目 `Value[3][3]` 是点位评估分；本项目按裁决统一 `SquareValue`。`cell` 是「单元格」「格网单元」；`token` 是词法单元/占用物 |

## 取舍

- 英文棋类资料把 `Square` 当坐标或位置：CPW 的 `Squares`、Stockfish 的 `enum Square`、chess.hpp、python-chess、Chess.com 都这样用；`Square` 只表示「哪一格」，不表示「格中是什么」。
- 井字棋英文资料更常用 `mark`：Exploratorium 写「putting their marks in empty squares」，SciMigo 的 `enum class Mark { Empty, X, O }` 也是直接先例。`Mark` 比 `SquareValue` 短，也不会把容器名重复进值类型。
- `SquareValue` 也有先例：LucHermitte 的 C++ 井字棋用 `enum class SquareValue` 与 `Square::value()`；Rust 的 tictacrustle 用 `SquareValue` 与 `set_value`；React 井字棋用 `value`。它和 `Square` 配对，读作「方格的值」。
- 风险在 `Value` 的歧义：Stockfish 的 `using Value = int` 是搜索分值；中文项目的 `Value[3][3]` 是点位评估分。`SquareValue` 有被读成「分值」的可能，所以类型注释必须写「方格的值：kEmpty（空）/ kX（X）/ kO（O）」，行尾写「空」「X」「O」；函数名跟类型走 `GetValue` / `SetValue`。
- 本项目按用户裁决使用 `SquareValue`，与插件规则、代码和书稿统一；`Mark` 只在英文资料的取舍说明里出现，不作为代码名。
- 中文用词：`Square` 写「方格」，`SquareValue` 写「方格的值」；`格子` 更泛（汉典「方形的空栏或框子」），`棋格` 是「下棋的技艺水平」（汉典），都不能替代「方格」；`棋盘` 是整块盘面。`值` 用「方格的值」「空」「X」「O」；`标记` 不再用于这个类型。

## 依据

- 有道 `square`：https://dict.youdao.com/result?word=square&lang=en
- 汉典 `方格`：https://www.zdic.net/hans/%E6%96%B9%E6%A0%BC
- 海词 `方格`：https://dict.cn/%E6%96%B9%E6%A0%BC
- 汉典 `格子`：https://www.zdic.net/hans/%E6%A0%BC%E5%AD%90
- 汉典 `棋格`：https://www.zdic.net/hans/%E6%A3%8B%E6%A0%BC
- 海词 `value`：https://dict.cn/value
- 汉典 `值`：https://www.zdic.net/hans/%E5%80%BC
- 柯林斯 `mark`：https://www.collinsdictionary.com/dictionary/english/mark
- CPW `Squares`：https://www.chessprogramming.org/Squares
- Stockfish `types.h`：https://github.com/official-stockfish/Stockfish/blob/master/src/types.h
- chess.hpp：https://github.com/lichess-org/chess.hpp
- python-chess `Core`：https://python-chess.readthedocs.io/en/latest/core.html
- Chess.com `square`：https://www.chess.com/terms/chess-squares
- LucHermitte/tictactoe：https://github.com/LucHermitte/tictactoe
- tictacrustle：https://github.com/stevenlr/tictacrustle
- React 井字棋：https://react.dev/learn/tutorial-tic-tac-toe
- Wikipedia `Tic-tac-toe`：https://en.wikipedia.org/wiki/Tic-tac-toe
- ISO C++ `[lex.name]`：https://eel.is/c++draft/lex.name
- ISO C++ `[dcl.enum]`：https://eel.is/c++draft/dcl.enum
- Google C++ Style, Naming：https://google.github.io/styleguide/cppguide.html#Naming
- C++ Core Guidelines, NL：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-naming
