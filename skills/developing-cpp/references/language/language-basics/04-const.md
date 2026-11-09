<!-- 读取时机：查语言细节时；读完能回答：`const`、`constexpr`、`consteval`、`constinit`；预算：一次只开这一份（25 行），不自动串联。 -->
# `const`、`constexpr`、`consteval`、`constinit`

| 关键字 | 承诺 | 典型位置 |
| --- | --- | --- |
| `const` | 初始化后不能通过这个名字修改 | 局部变量、参数、成员函数尾部 |
| `constexpr` | 能在编译期求值（满足条件时） | 常量、函数、构造函数 |
| `consteval` | 必须在编译期求值 | 编译期校验函数 |
| `constinit` | 静态或线程存储期变量在编译期完成初始化 | 全局、静态与 `thread_local` 变量 |
| `inline constexpr` | 头文件里可共享的编译期常量，避免 ODR 问题 | 命名空间作用域常量 |

- 共享常量写在头文件的命名空间作用域：`inline constexpr int kMaxRows = 3;`，不要用 `#define`。`.cpp` 里非 `inline`、非 `extern` 的命名空间作用域 `constexpr` 已有内部链接。
- `constexpr` 函数在首次声明处隐式 `inline`，用到它的翻译单元都必须看见定义，所以定义放头文件；只写在 `.cpp` 里会让其他翻译单元的调用成为不要求诊断的不合规程序。
- 不要给所有函数加 `constexpr`；只有确实需要在编译期使用、且实现满足约束时才加。
- `constinit` 只保证初始化时机，不保证不可修改；需要不可修改时同时写 `const`。
- C++14 起 `constexpr` 函数就可以包含循环、局部变量与 `if`/`switch`；C++20 起还允许编译期分配，但分配要在同一次求值内释放。也不要把运行期逻辑塞进编译期。
- 局部变量默认不加 `const`：短生命周期的局部值只读一次，`const` 不改变存储与运行行为。把 `const` 留给接口契约——`const` 引用参数、`const` 成员函数、指向只读数据的指针与视图，以及确实要防止后续误写的变量。Core Guidelines 的 Con.1 主张默认不可变；本仓取 Google 风格的做法，只在接口层要求 `const`。

## 依据

- [ISO C++ `[dcl.constexpr]`](https://eel.is/c++draft/dcl.constexpr)：`constexpr`、`consteval` 的求值时机与函数约束。
- [cppreference: `constexpr`](https://en.cppreference.com/w/cpp/language/constexpr)：常量表达式、`constinit` 与 `consteval` 的对照。
- [cppreference: `constinit`](https://en.cppreference.com/w/cpp/language/constinit)：静态与线程存储期的初始化时机，不改变可修改性。
- [Google C++ Style Guide: Use of const](https://google.github.io/styleguide/cppguide.html#Use_of_const)：「We strongly recommend using `const` in APIs (i.e., on function parameters, methods, and non-local variables) wherever it is meaningful and accurate.」局部变量不在要求之内。
- [Chromium C++ style](https://chromium.googlesource.com/chromium/src/+/main/styleguide/c++/c++.md) 与 [LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html)：同样没有要求局部变量加 `const`；LLVM 只对静态与全局常量用 `constexpr`。
- [C++ Core Guidelines: Con.1](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rconst-immutable)：主张默认不可变；本仓只在接口处采用这一主张，局部变量按上一条处理。
