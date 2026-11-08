# 正反例：文件头与注释边界

## 文件头

**差**：

```cpp
// board.h
// 作者：chengzhao-dev
// 创建：2026-01-01
// 修改：2026-03-02 增加 CompletesLine
```

**好**：

```cpp
/// @file square.h
/// @brief 方格相关类型定义。
///
/// 封装了方格的值 `SquareValue` 以及方格实体 `Square`。
```

文件头只介绍这个文件里有什么，不写作者和变更史，也不把读者指去另一个文件。

## 风格理由不进注释

**差**（在十几个函数上各写一遍）：

```cpp
/// 检查坐标是否在范围内。函数名用 UpperCamel 而不是 snake_case，与标准库区分。
[[nodiscard]] static bool IsInRange(Position pos) noexcept;

/// 检查方格是否为空。函数名用 UpperCamel 而不是 snake_case，与标准库区分。
[[nodiscard]] bool IsSquareEmpty(Position pos) const;
```

**好**（只写契约）：

```cpp
/// 检查坐标是否落在棋盘下标区间内。
[[nodiscard]] static bool IsInRange(Position pos) noexcept;
```

命名与风格约定写进项目文档和读者正文，注释里不解释「为什么用这种命名」。

## 不该进注释的东西

**差**：

```cpp
// 2026-03-02 把 Board 从 Game 里拆出来，因为之前 Game 太长。
// 参见 https://example.com/2026/03/02/refactor
// 其余成员见下方注释，两处不重复。
// 本团队要求所有类注释写满五行。
```

**好**：

```cpp
/// @file board.h
/// @brief 棋盘状态与规则判断。
///
/// 定义 Board 的查询、落子与清空棋盘。
```

变更史进提交说明，外部资料进文档，团队流程进规范文件；注释只写这个文件或这个类型自己的内容，不把读者指去别的文件。
