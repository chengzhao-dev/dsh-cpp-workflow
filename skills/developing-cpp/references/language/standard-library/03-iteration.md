# 迭代与失效

- 范围 `for` 默认按值复制元素；大对象写 `const auto&`，需要修改写 `auto&`。
- 在范围 `for` 里修改容器大小会使迭代器失效；先收集要改的 key，再统一修改。
- `vector` 扩容会使所有指针、引用、迭代器失效；`reserve` 只能减少扩容次数，不能保证永不失效。
- `map` / `unordered_map` 插入不会使其他元素的引用失效；`unordered_map` 的 rehash 会使迭代器失效。
- 删除元素用 `erase-remove` 惯用法或 C++20 `std::erase` / `std::erase_if`；不要在遍历中直接 `erase` 当前迭代器以外的元素。

```cpp
std::vector<int> values{1, 2, 3, 4, 5};
std::erase_if(values, [](int value) { return value % 2 == 0; });
```

## 依据

- [ISO C++ `[container.requirements]`](https://eel.is/c++draft/container.requirements)：插入、删除与 rehash 对迭代器/引用的影响。
- [cppreference: Iterator invalidation](https://en.cppreference.com/w/cpp/container#Iterator_invalidation)：各容器的失效条件。
- [C++ Core Guidelines: SL.con.3](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-stdlib)：用算法与范围操作替代手写遍历。
