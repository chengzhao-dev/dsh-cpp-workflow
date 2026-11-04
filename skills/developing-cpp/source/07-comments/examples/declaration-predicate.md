# 正反例：布尔查询只写检查什么

完整写法：

```cpp
/// 检查指定坐标上的棋盘格子是否为空。
///
/// @param pos 待检查的坐标。
/// @return 坐标在棋盘内且该格为空时返回 true；越界或该格是 X 或 O 时返回 false。
[[nodiscard]] bool IsCellEmpty(Position pos) const;
```

布尔查询的第一句写「检查…是否…」，`@return` 写成立与不成立的条件；能力边界不写成否定清单，调用方要满足的条件用正向限定或 `@pre`。
