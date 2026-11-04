# 访问与边界

- `operator[]` 不检查边界，越界是未定义行为；`at` 检查并抛 `std::out_of_range`。规则与家族差异见 `source/05-language/02-value-types/09-subscript.md`。
- `vector::front()` / `back()` / `data()` 在空容器上未定义；先 `empty()`。
- `map::operator[]` 缺键会插入默认值；只读查询用 `find`、`contains`（C++20）或 `at`。
- `string_view` 不保证以 `\0` 结尾；传给需要 C 字符串的 API 前先转成 `std::string`。
- `span` 不拥有元素，也不延长生命周期；不要从临时容器构造后保存。
- 迭代器区间是半开的 `[first, last)`；`end()` 不指向元素，不能解引用。
