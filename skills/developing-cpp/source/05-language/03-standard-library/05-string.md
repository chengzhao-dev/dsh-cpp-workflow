# `std::string` 与 `std::string_view`

- 函数只读文本时参数用 `std::string_view`；需要保存或修改时用 `std::string`。
- `string_view` 不拥有内存；不要返回指向局部 `std::string` 的 `string_view`，也不要把临时 `std::string` 转成 `string_view` 后保存。
- 拼接少量文本用 `std::string` 的 `+=` 或 `std::format`；大量拼接先 `reserve`。
- 查找子串用 `find`，找不到返回 `npos`；不要用 `-1` 比较。
- 数值与文本互转用 `std::to_string` / `std::from_chars` / `std::format`；`std::stoi` 会抛异常且不报告消耗长度。
