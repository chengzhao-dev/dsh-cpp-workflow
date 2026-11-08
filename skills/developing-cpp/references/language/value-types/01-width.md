# 宽度、范围与 `std::size_t`

类型不是存储格式的同义词。先写清一个值允许什么、禁止什么，再选 `int`、`std::int32_t`、`enum class` 还是包装类型。

- C++ 只保证基础整数类型的最小范围，不保证 `int` 固定 32 位，也不保证 `long` 一定宽于 `int`。
- `sizeof(T)` 返回 `std::size_t`；`<limits>` 的 `std::numeric_limits<T>` 查询最大值、最小值和特殊值。
- 协议、文件格式或跨平台布局要求固定宽度时，用 `<cstdint>` 的 `std::int32_t`、`std::uint64_t`，并确认目标平台提供该类型。
- `char` 是否有符号由实现决定；存字符时不要把它当成固定范围的小整数。
- 整数字面量的类型由后缀和候选类型决定；宽度或符号属于接口时，写出目标类型并检查转换。

`std::size_t` 是无符号类型，适合对象大小和容器下标。把它和负的 `int` 比较会先转成无符号，结果与直觉相反。统一下标类型，或先验证非负再比较。

## 依据

- ISO C++ `[basic.fundamental]`：整数类型的最小范围、`char` 的符号由实现决定。https://eel.is/c++draft/basic.fundamental
- cppreference `std::size_t`：无符号、足以表示对象大小。https://en.cppreference.com/w/cpp/types/size_t
- Google C++ Style, Integer Types：默认用 `int`，固定宽度用 `<cstdint>`，不用无符号类型表达“不会为负”。https://google.github.io/styleguide/cppguide.html#Integer_Types
