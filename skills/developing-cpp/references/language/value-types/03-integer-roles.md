# 项目对整型角色的约定

| 角色 | 类型 | 理由 |
| --- | --- | --- |
| 不能为负的尺寸、容器长度、`std::array` 长度 | `std::size_t` | 与 STL 和 NTTP 一致 |
| 坐标等允许表示范围外取值的下标 | `int` | 能表达负值；越界判断交给持有尺寸的类型 |
| 没有上面两种理由的整数 | `int` | 宽度足够，写起来最短 |
| 取值很少的 `enum class` 的底层类型 | `std::uint8_t` | 只表达取值集合和布局，不参与算术 |

- 协议、文件格式与跨平台布局仍用 `<cstdint>` 的定宽整数（如 `std::int32_t`）；工程内普通代码不必写定宽类型。
- 不用裸 `int` 承担跨平台协议或布局；它的宽度不可预测。
- 不用 `std::uint8_t` / `std::uint16_t` 当业务编号；负值无法表达，整数提升还会制造意外。
- 常量容器长度由有符号整数相乘得到时，操作数都是编译期常量，先相乘再整体转换：

```cpp
inline constexpr int kBatchSize = 3;
inline constexpr int kItemsPerBatch = 3;
inline constexpr std::size_t kItemCount =
    static_cast<std::size_t>(kBatchSize * kItemsPerBatch);
std::array<TaskState, kItemCount> items_{};
```

溢出在常量表达式求值时就暴露，不必逐个转换；写成 `static_cast<std::size_t>(kBatchSize) * static_cast<std::size_t>(kItemsPerBatch)` 反而把同一件事拆成两次转换。

- 操作数里只要有一个是运行期值（普通 `int` 变量、参数或读到的数字），就逐个拓宽再乘加；先算后转会把乘加留在 `int` 里，溢出发生在转换之前。不要为了通过检查而关闭它，也不要改业务编号的类型。

```cpp
// 不要：乘加先在 int 里完成，溢出发生在转换之前
return static_cast<std::size_t>(row * column_count + col);

// 要：每个操作数先拓宽，乘加在 std::size_t 里做
return static_cast<std::size_t>(row) * static_cast<std::size_t>(column_count) +
       static_cast<std::size_t>(col);
```

- 编译期常量走整体转换，运行期值逐个拓宽；尺寸很小时两者结果相同，规则约束的是尺寸或坐标来源变化后的行为。有符号 `int` 溢出是未定义行为，拓宽后整个表达式按无符号回绕，行为有定义。
- `std::size_t{row}` 不能替代 `static_cast`：`row` 可能为负且不是常量表达式，花括号初始化会因窄化编译失败。先检查范围，再转换。
- 工程另开 `bugprone-implicit-widening-of-multiplication-result` 时，先算后转会被这条检查报出；项目模板默认不启用 `bugprone-*`，本规则仍要遵守。
