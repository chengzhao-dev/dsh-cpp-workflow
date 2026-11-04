# `const`、`constexpr`、`consteval`、`constinit`

| 关键字 | 承诺 | 典型位置 |
| --- | --- | --- |
| `const` | 初始化后不能通过这个名字修改 | 局部变量、参数、成员函数尾部 |
| `constexpr` | 能在编译期求值（满足条件时） | 常量、函数、构造函数 |
| `consteval` | 必须在编译期求值 | 编译期校验函数 |
| `constinit` | 静态存储期变量在编译期完成初始化 | 全局/静态变量 |
| `inline constexpr` | 头文件里可共享的编译期常量，避免 ODR 问题 | 命名空间作用域常量 |

- 共享常量写在头文件的命名空间作用域：`inline constexpr int kMaxRows = 3;`，不要用 `#define`。`.cpp` 里非 `inline`、非 `extern` 的命名空间作用域 `constexpr` 已有内部链接。
- `constexpr` 函数的定义要放在头文件里，否则其他翻译单元无法在编译期调用。
- 不要给所有函数加 `constexpr`；只有确实需要在编译期使用、且实现满足约束时才加。
- `constinit` 只保证初始化时机，不保证不可修改；需要不可修改时同时写 `const`。
- C++20 起 `constexpr` 函数可以包含循环、局部变量和部分动态分配，但不要借此把运行期逻辑塞进编译期。
