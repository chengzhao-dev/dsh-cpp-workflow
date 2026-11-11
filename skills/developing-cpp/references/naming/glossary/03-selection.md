<!-- 读取时机：判不准选择类函数用 Choose、Find 还是 Try 时；读完能回答：选择与查找的命名；预算：一次只开这一份（22 行），不自动串联。 -->
# selection：选择、查找与尝试

从多个候选里选一个，用 `Choose`；名字写清选的对象，如 `ChooseRandomPosition`、`ChooseBestPosition`；对外只暴露 `ChoosePosition`。没有合法候选时返回 `std::optional` 的空值，不返回哨兵位置，也不抛异常。

查找已经存在的元素，用 `Find`；找不到是正常结果，返回 `std::optional`、指针或迭代器。`Get` 只用于前置条件保证存在的查询；`GetLine` 这类界面读入不在此列，输入结束用 `std::optional` 表示。

可能失败、且调用方需要区分原因的动作，用 `Try` 或领域动词；返回 `enum class` 结果。只有一个失败原因时返回 `bool`。

## 语义对照

| 语义 | 写法 | 例子 |
| --- | --- | --- |
| 从候选里选一个 | `Choose` + 对象 | `ChooseRandomPosition`、`ChooseBestPosition` |
| 查找已有元素 | `Find` + 对象 | `FindMove`、`FindSquare` |
| 可能失败的动作 | `Try` / 领域动词 | `TryParse`、`Place` |
| 前置条件保证存在 | `Get` + 对象 | `GetCurrentPlayer` |

## 取舍

`Choose` 不暗示候选一定存在，所以返回 `optional`；`Find` 的失败是正常结果，不抛；`Try` 的失败原因需要调用方分支，所以返回结果类型。`Get` 不用于可能找不到的查询。

依据见 [01-identifier-names.md](../01-identifier-names.md) 的「语义角色」与末尾 12 条来源。
