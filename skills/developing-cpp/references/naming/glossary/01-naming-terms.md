<!-- 读取时机：统一命名术语时；读完能回答：命名术语与用词；预算：一次只开这一份（27 行），不自动串联。 -->
# 命名术语与用词

本文件是 `references/naming/01-identifier-names.md` 的附录，只在判不准某个词该用完整写法还是缩写时打开；它不随该文件一起加载，也不重复命名规则表。

一词一文件只用于命名主题的词汇；注释与语言主题仍用单份术语文件，不按这个结构拆。

## 词表

| 词 | 结论 | 条目 |
| --- | --- | --- |
| `position` / `pos` | 坐标值的参数与局部变量用 `pos`；公开数据成员用 `position`；迭代器式位置对象用 `position` | [02-position.md](02-position.md) |
| `square` / `SquareValue` | 方格；方格的值；不用 `Mark`、`Cell`、`Token` | [04-square.md](04-square.md) |
| `selection` | 从多个候选里选一个用 `Choose`，找不到合法候选返回 `optional`；查找已有元素用 `Find`；可能失败的动作与校验用 `Try` | [03-selection.md](03-selection.md) |
| `score` | 终局评分用 `ScoreFinishedGame`，搜索分是 `int`；不把分数塞进 `GameResult` | [05-scoring.md](05-scoring.md) |
| `difficulty` | 电脑难度用 `Difficulty` 两档 `kNormal`/`kHard`；与 `MatchMode` 分层 | [06-difficulty.md](06-difficulty.md) |
| `input` / `output` / `diagnostics` | 流的参数与成员写完整词，不用 `in` / `out` / `err` | [07-stream.md](07-stream.md) |

## 加词流程

1. 查 ISO C++ 草案对应条款，记下标准自己的写法。
2. 查一个标准库实现（libstdc++ 或 libc++）与一个同类库（Qt、SFML、Godot）。
3. 结论写进 `glossary/<NN>-<词>.md`，词表加一行链接；只有一词多义或社区争议大时，才在词条里展开。
4. 同一事实只写一遍：规则在 `01-identifier-names.md`，依据与取舍在词条里。

## 词条格式

每个词条按 [02-position.md](02-position.md) 的结构写：一句话结论、语义对照表（语义 / 写法 / 依据）、取舍说明、依据链接。
