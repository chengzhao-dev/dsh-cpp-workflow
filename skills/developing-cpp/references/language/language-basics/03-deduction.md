# `auto` 与类型推导

- `auto` 适合“右侧类型显然且无关紧要”的局部变量，例如迭代器、`make_unique` 结果、范围 `for`。
- 公共接口、类成员、函数返回类型写显式类型；返回值需要隐藏实现细节时才可以写 `auto`，且头文件里要能看出契约。
- `auto` 会丢掉顶层 `const` 和引用：`auto value = const_ref` 得到副本；需要引用时写 `const auto&`。
- 结构化绑定 `auto [key, value] : map` 中，`key` 是副本；要避免复制时写 `const auto& [key, value]`。

## 依据

- [ISO C++ `[dcl.spec.auto]`](https://eel.is/c++draft/dcl.spec.auto)：`auto` 的推导规则与占位符约束。
- [cppreference: `auto`](https://en.cppreference.com/w/cpp/language/auto)：顶层 `const`/引用丢失、`decltype(auto)` 与结构化绑定。
- [Google C++ Style Guide: `auto`](https://google.github.io/styleguide/cppguide.html#auto)：只在类型显然的局部变量使用，公共接口写显式类型。
