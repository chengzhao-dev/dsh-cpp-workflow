# 正反例：函数声明注释

## 第一句：结果、保证或检查项

**差**：

```cpp
/// 检查坐标。
/// 返回格子类型；越界会抛异常。
CellState GetState(Position pos) const;
```

前两句都没有直接回答“合法时拿到什么、越界时发生什么”，读者要读完三句才拼出合同。

**好**：

```cpp
/// 坐标越界时抛出 std::out_of_range；合法坐标返回该格类型。
///
/// @param pos 行列坐标。
/// @throws std::out_of_range 坐标不在棋盘范围内。
CellState GetState(Position pos) const;
```

第一句就是结果、失败方式或检查项；后面的标签只补参数与异常细节，不再重复这句话。

**差**（比较函数却先写“比较”）：

```cpp
/// 比较两个坐标。
friend bool operator==(const Position&, const Position&) = default;
```

**好**：

```cpp
/// 检查两个坐标的行与列是否都相同。
friend bool operator==(const Position&, const Position&) = default;
```

布尔查询和 `operator==` 的第一句都用「检查…是否…」，让读者先看到被检查的条件，而不是一个同义反复的动词。

## 函数契约

**差**：

```cpp
/// 尝试执行一次落子。
///
/// @param move 落子。
/// @returns 落子执行成功返回 kPlaced，被拒绝返回 kOccupied。
[[nodiscard]] MoveResult TryPlace(const Move& move);
```

`@param move 落子` 是把类型名翻译成中文，没有信息；`@returns` 不是 Doxygen 标签；没有说被拒绝的条件，调用方只能读实现。

**好**：

```cpp
/// 尝试执行一次落子。
///
/// 只有本局仍在进行、且落子玩家正是当前玩家时才继续，棋盘、轮次、历史三者一起更新。
///
/// @param move 待执行的落子，玩家必须是当前轮到的玩家。
/// @return 落子写入棋盘并换手时返回 kPlaced；对局已结束或上述任一条件不满足时返回 kOccupied，
///         棋盘和轮次都不变。
[[nodiscard]] MoveResult TryPlace(const Move& move);
```

## 从函数体注释到函数头注释

函数体里写：

```cpp
// 检查传入状态是否为空。传入状态为空时，格子保持原状态。
```

第一句作函数头的简要描述；第二句是后置条件，写进 `@return` 时要补上返回值：

```cpp
/// 检查传入状态是否为空。
///
/// @param state 传入的格子状态。
/// @return 传入状态为空时返回 true；传入状态是 X 或 O 时返回 false。
[[nodiscard]] bool IsEmptyState(CellState state);
```

返回值不止一个时，不要只写一个 `@return`；按 `@retval` 每值一行，成功在前：

```cpp
/// 检查传入状态是否为空，再放到空格子上。
///
/// @param state 传入的格子状态。
/// @retval kUpdated 格子为空，更新为传入状态
/// @retval kRejected 传入状态为空，格子保持原状态
/// @retval kOccupied 格子是 X 或 O，保持原状态
[[nodiscard]] PlaceResult Place(CellState state);
```

第一句必须说清这个函数做什么；函数体第一句只是其中一次检查时，补上动作再作简要描述。`@return` 写返回值，不写「格子保持原状态」这种后置条件本身；后置条件放在返回值说明里。布尔查询把条件映射成 true/false；会写入的函数把「格子保持原状态」写进对应返回值的说明。
