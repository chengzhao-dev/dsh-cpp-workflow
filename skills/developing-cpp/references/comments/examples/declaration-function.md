# 正反例：函数声明注释

## 第一句：结果、保证或检查项

**差**：

```cpp
/// 检查坐标。
/// 返回方格；越界会抛异常。
Square GetSquare(Position pos) const;
```

前两句都没有直接回答“合法时拿到什么、越界时发生什么”，读者要读完三句才拼出合同。

**好**：

```cpp
/// 坐标越界时抛出 std::out_of_range；合法坐标返回该格。
///
/// @param pos 行列坐标。
///
/// @throws std::out_of_range 坐标不在棋盘范围内。
Square GetSquare(Position pos) const;
```

第一句就是结果、失败方式或检查项；后面的标签只补参数与异常细节，不再重复这句话。

**差**（比较函数却先写“比较”）：

```cpp
/// 比较两个坐标。
friend bool operator==(const Position&, const Position&) = default;
```

**好**：

```cpp
/// 相等运算符。
///
/// 当两个坐标的行与列都相同时返回 true。
friend bool operator==(const Position&, const Position&) = default;
```

布尔查询的第一句用「检查…是否…」，让读者先看到被检查的条件；`operator==` 写「相等运算符。」，第二句说明成立条件。

## 函数契约

**差**：

```cpp
/// 尝试执行一次落子。
///
/// @param move 落子。
///
/// @returns 落子执行成功返回 kPlaced，失败返回 kOccupiedSquare 或 kEmptySquare。
[[nodiscard]] PlaceResult TryPlace(Move move);
```

`@param move 落子` 是把参数名翻译成中文，没有信息；`@returns` 与 `@return` 同义，本契约统一写 `@return`；没有说被拒绝的条件，调用方只能读实现。

**好**：

```cpp
/// 执行一次落子。
///
/// 依次检查玩家、对局状态、要写入的值与目标方格；全部通过才写入棋盘、记录历史并轮换玩家。
///
/// @param move 要执行的落子。
///
/// @return 落子成功返回 `kPlaced`；其余值表示没有写入，原因见 `PlaceResult`。
///
/// @throws std::out_of_range 对局进行中且行或列超出棋盘时抛出。
[[nodiscard]] PlaceResult Place(Move move);
```

## 从函数体注释到函数头注释

函数体里写：

```cpp
// 检查传入的值是否为空。
```

这一句作函数头的简要描述；后置条件（对局不变）由分支里的 `return` 表达，需要写进函数头时用 `@return` 补上返回值：

```cpp
/// 检查传入的值是否为空。
///
/// @param value 待检查的值。
///
/// @return 传入的是 kEmpty 时返回 true；传入的是 kX 或 kO 时返回 false。
[[nodiscard]] bool IsEmptyValue(SquareValue value);
```

返回值不止一个时，不要只写一个 `@return`；按 `@retval` 每值一行，成功在前：

```cpp
/// 执行一次落子。
///
/// 依次检查玩家、对局状态、要写入的值与目标方格；全部通过才写入棋盘、
/// 记录历史并轮换玩家。任一检查不通过时对局不变。
///
/// @param move 要执行的落子。
///
/// @retval kPlaced 成功：落子玩家是当前玩家，值已写入方格
/// @retval kInvalidPlayer 失败：落子玩家不是当前玩家，没有写入
/// @retval kFinishedGame 失败：对局已经结束，没有写入
/// @retval kEmptySquare 失败：要写入的值是 `kEmpty`，没有写入
/// @retval kOccupiedSquare 失败：目标方格已有值，没有写入
///
/// @throws std::out_of_range 对局进行中且行或列超出棋盘时抛出。
[[nodiscard]] PlaceResult Place(Move move);
```

第一句必须说清这个函数做什么；函数体第一句只是其中一次检查时，补上动作再作简要描述。`@return` 写返回值，不写「对局不变」这种后置条件本身；多种结果时按 `@retval` 写清每种结果何时返回，说法与枚举项的行尾注释一致即可。布尔查询把条件映射成 true/false；失败结果写清没有写入与原因，不重复类型注释已经交代的共同后果。

第一段不写参数名，像「把 value 写到 pos 对应的方格上」这种句子把签名里的名字搬进摘要，离开签名就读不懂；改成「把指定值写到指定坐标的方格上」，名字留给 `@param`。`@param` 里的参数名是绑定声明，`kX`、`kO` 这类枚举值仍用反引号。

## 用词：先找名词

**差**：

```cpp
/// 获取已经下过的每一次落子。
[[nodiscard]] std::span<const Move> GetHistory() const;
```

**好**：

```cpp
/// 获取落子历史。
[[nodiscard]] std::span<const Move> GetHistory() const;
```

领域里已经有名词（历史、棋盘、落子）时直接用它，不把集合摊成「已经下过的每一次…」这类短语：后者更长，读者还要自己把它归纳成「历史」。用词规则见 `references/comments/glossary/comment-terms.md`。
