<!-- 读取时机：查语言细节时；读完能回答：访问与边界；预算：一次只开这一份（14 行），不自动串联。 -->
# 访问与边界

- `operator[]` 不检查边界，越界是未定义行为；`at` 检查并抛 `std::out_of_range`。规则与家族差异见 `references/language/value-types/09-subscript.md`。
- `vector::front()` / `back()` 在空容器上未定义；`data()` 在空容器上返回的指针不能解引用。先 `empty()`。
- `map::operator[]` 缺键会插入默认值；只读查询用 `find`、`contains`（C++20）或 `at`。
- `string_view` 不保证以 `\0` 结尾；传给需要 C 字符串的 API 前先转成 `std::string`。
- `span` 不拥有元素，也不延长生命周期；不要从临时容器构造后保存。
- 迭代器区间是半开的 `[first, last)`；`end()` 不指向元素，不能解引用。

## 依据

- [ISO C++ `[sequence.reqmts]`](https://eel.is/c++draft/sequence.reqmts)：`at` 与 `operator[]` 的边界行为。
- [cppreference: `array::at`](https://en.cppreference.com/w/cpp/container/array/at)：越界抛 `std::out_of_range` 的契约。
- [C++ Core Guidelines: SL.con.2](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-stdlib)：默认用 `at`，只在已证明边界时用 `[]`。
