<!-- 读取时机：写或改注释的示例时；读完能回答：正反例：文件头与注释边界；预算：一次只开这一份（72 行），不自动串联。 -->
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
///
/// @brief 方格与方格值类型定义。
///
/// 方格的值 `SquareValue` 与方格 `Square`。
```

文件头只介绍这个文件里有什么，不写作者和变更史，也不把读者指去另一个文件。

## 风格理由不进注释

**差**（在十几个函数上各写一遍）：

```cpp
/// 坐标是否在范围内。函数名用 UpperCamel 而不是 snake_case，与标准库区分。
[[nodiscard]] static bool IsInRange(const Position& position) noexcept;

/// 方格是否为空。函数名用 UpperCamel 而不是 snake_case，与标准库区分。
[[nodiscard]] bool IsSquareEmpty(const Position& position) const;
```

**好**（只写契约）：

```cpp
/// 坐标是否落在棋盘下标区间内。
///
/// @param position 棋盘上的行列坐标。
///
/// @return 坐标在棋盘内时返回 true；越界时返回 false。
[[nodiscard]] static bool IsInRange(const Position& position) noexcept;
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
///
/// @brief 棋盘类型定义。
///
/// 棋盘：方格容器，提供按坐标读写、清空，以及成线与满盘查询。
```

变更史进提交说明，外部资料进文档，团队流程进规范文件；注释只写这个文件或这个类型自己的内容，不把读者指去别的文件。
