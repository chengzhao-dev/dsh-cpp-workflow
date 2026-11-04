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
- 有符号乘法进入容器长度前先显式拓宽，否则会触发 `bugprone-implicit-widening-of-multiplication-result`：

```cpp
inline constexpr int kBatchSize = 3;
inline constexpr int kItemsPerBatch = 3;
inline constexpr std::size_t kItemCount =
    static_cast<std::size_t>(kBatchSize) * static_cast<std::size_t>(kItemsPerBatch);
std::array<TaskState, kItemCount> items_{};
```

- 下标换算在同一函数里先 `static_cast<std::size_t>` 各操作数再乘加；不要为此关闭检查，也不要改业务编号的类型。
