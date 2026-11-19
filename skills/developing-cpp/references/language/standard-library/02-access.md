<!-- 读取时机：查语言细节时；读完能回答：访问与边界；预算：一次只开这一份（11 行），不自动串联。 -->
# 访问与边界

- 下标族（`operator[]`、`at`、`map` 的插入行为、`span` 的边界）见 `references/language/value-types/09-subscript.md`；`string_view` 的生命周期见 `05-string.md`。
- `vector::front()` / `back()` 在空容器上未定义；`data()` 在空容器上返回的指针不能解引用。先 `empty()`。
- 迭代器区间是半开的 `[first, last)`；`end()` 不指向元素，不能解引用。

## 依据

- [ISO C++ `[sequence.reqmts]`](https://eel.is/c++draft/sequence.reqmts)：`at` 与 `operator[]` 的边界行为。
- [cppreference: `array::at`](https://en.cppreference.com/w/cpp/container/array/at)：越界抛 `std::out_of_range` 的契约。
- [C++ Core Guidelines: SL.con.2](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-stdlib)：默认用 `at`，只在已证明边界时用 `[]`。
