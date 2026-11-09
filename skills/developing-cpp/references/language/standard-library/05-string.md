<!-- 读取时机：查语言细节时；读完能回答：`std::string` 与 `std::string_view`；预算：一次只开这一份（13 行），不自动串联。 -->
# `std::string` 与 `std::string_view`

- 函数只读文本时参数用 `std::string_view`；需要保存或修改时用 `std::string`。
- `string_view` 不拥有内存；不要返回指向局部 `std::string` 的 `string_view`，也不要把临时 `std::string` 转成 `string_view` 后保存。
- 拼接少量文本用 `std::string` 的 `+=` 或 `std::format`；大量拼接先 `reserve`。
- 查找子串用 `find`，找不到返回 `npos`；不要用 `-1` 比较。
- 数值与文本互转用 `std::to_string` / `std::from_chars` / `std::format`；`std::stoi` 会抛异常且不报告消耗长度。

## 依据

- [ISO C++ `[string.view]`](https://eel.is/c++draft/string.view)：`string_view` 不拥有字符、不保证空字符结尾。
- [cppreference: `std::string_view`](https://en.cppreference.com/w/cpp/string/basic_string_view)：生命周期与只读接口。
- [C++ Core Guidelines: SL.str.2](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-stdlib)：用 `string_view` 传只读文本，用 `string` 保存文本。
