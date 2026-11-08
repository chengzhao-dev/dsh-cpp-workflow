# 命名术语与用词

本文件是 `references/naming/identifier-names.md` 的附录，只在判不准某个词该用完整写法还是缩写时打开；它不随该文件一起加载，也不重复命名规则表。

一词一文件只用于命名主题的词汇；注释与语言主题仍用单份术语文件，不按这个结构拆。

## 词表

| 词 | 结论 | 条目 |
| --- | --- | --- |
| `position` / `pos` | 坐标值的参数与局部变量用 `pos`；公开数据成员用 `position`；迭代器式位置对象用 `position` | [position.md](position.md) |
| `square` / `SquareValue` | 方格；方格的值；不用 `Mark`、`Cell`、`Token` | [square.md](square.md) |

## 加词流程

1. 查 ISO C++ 草案对应条款，记下标准自己的写法。
2. 查一个标准库实现（libstdc++ 或 libc++）与一个同类库（Qt、SFML、Godot）。
3. 结论写进 `glossary/<词>.md`，词表加一行链接；只有一词多义或社区争议大时，才在词条里展开。
4. 同一事实只写一遍：规则在 `identifier-names.md`，依据与取舍在词条里。

## 词条格式

每个词条按 [position.md](position.md) 的结构写：一句话结论、语义对照表（语义 / 写法 / 依据）、取舍说明、依据链接。
