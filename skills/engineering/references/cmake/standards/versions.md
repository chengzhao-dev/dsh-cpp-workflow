<!-- 读取时机：配 CMake 或工具链时；读完能回答：C++11–C++23 各档差异；预算：一次只开这一份（43 行），不自动串联。 -->
# 各标准差异

本页只列每档相对前一档多出什么、不能假设什么、降到这一档要改什么。选择表、共用矩阵、CMake/clang-format/clangd 共用规则与验证矩阵在 [index.md](index.md)；每档的 CMake 片段在 `c++NN/cmake-snippet.cmake`。

## C++11

- 能用：`auto`、范围 `for`、lambda、右值引用与移动语义、`std::unique_ptr`/`shared_ptr`、`std::thread`/`chrono`、`enum class`、`override`/`final`、变参模板、受限 `constexpr`、`std::array`、`unordered_map`/`unordered_set`。
- 不能假设：`std::make_unique`、泛型 lambda、变量模板、返回类型推导、`std::string_view`、`std::optional`、`std::variant`、`if constexpr`、结构化绑定、`[[nodiscard]]`、`std::filesystem`、`std::format`、`std::print`；不要用 C++14 的放宽 `constexpr` 写循环或多语句函数。
- 降档/升级：这是最低档；从 C++14 降到这里，先去掉 `std::make_unique`、泛型 lambda、返回类型推导和变量模板。`std::unique_ptr<T>(new T(...))` 只作过渡，不要在新代码里扩散。
- 验证：`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++11`，不能是 `gnu++11`；模板的 `__cplusplus` 分支走字符串拼接。
- 片段：[cmake-snippet.cmake](c++11/cmake-snippet.cmake)。

## C++14

- 能用：C++11 的全部内容；`std::make_unique`、泛型 lambda、变量模板、返回类型推导、二进制字面量、数字分隔符、放宽的 `constexpr`、`std::integer_sequence`。
- 不能假设：`std::string_view`、`std::optional`、`std::variant`、`if constexpr`、结构化绑定、`[[nodiscard]]`、`std::filesystem`、`std::format`、`std::print`；不要把 C++17 的写法靠编译器扩展通过。
- 降档/升级：从 C++17 降到这里，把 `string_view` 改成 `const std::string&`，把 `optional` 改成 `bool` + 输出参数或项目结果类型，把 `if constexpr` 改成标签分派或重载。升级到 C++17 后也不要立刻把公共接口全改成 `string_view`，先看调用方生命周期。
- 验证：`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++14`；模板在 C++14 下走字符串拼接。
- 片段：[cmake-snippet.cmake](c++14/cmake-snippet.cmake)。

## C++17

- 能用：C++14 的全部内容；`std::string_view`、`std::optional`、`std::variant`、`std::any`、`if constexpr`、结构化绑定、`[[nodiscard]]`、内联变量、嵌套命名空间、`std::filesystem`、并行算法（库实现和链接方式另看）。
- 不能假设：concepts、ranges、`std::format`、`std::span`、`std::bit_cast`、`std::print`、`std::expected`、`std::stacktrace`、`= default` 的比较运算符；`std::filesystem` 在 GCC 8 需要额外链接 `stdc++fs`，GCC 9 起才稳定。
- 降档/升级：从 C++20 降到这里，把 concepts 改成 `enable_if`/重载，把 ranges 改成迭代器算法，把 `std::format` 改成 `std::ostringstream`，把 `= default` 的比较运算符改回结构体外的手写自由函数。升级到 C++20 后先确认 `std::format` 的库门槛（libstdc++ 13+ / libc++ 14+），不要只看编译器版本。
- 验证：`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++17`；模板在 C++17 下仍走字符串拼接。
- 片段：[cmake-snippet.cmake](c++17/cmake-snippet.cmake)。

## C++20

- 能用：C++17 的全部内容；concepts、requires、ranges、`std::span`、`std::bit_cast`、`std::source_location`、`std::format`、协程、`std::jthread`、三路比较；调用方需要按成员逐项比较时写 `bool operator==(const T&) const = default`，C++23 沿用；模块语法可用，但工具链支持不完整，模板不使用。
- 不能假设：`std::print`、`std::expected`、`std::stacktrace`、`if consteval`、显式对象参数；`std::format` 不只看语言核心：libstdc++ 13+，libc++ 14+ 实现完成，但特性宏到 19 才稳定；模块、协程的构建支持因编译器/构建系统而异。
- 降档/升级：从 C++23 降到这里，把 `std::print` 改成 `std::format` + `std::cout`，把 `std::expected` 改成 `std::optional` 或项目结果类型，去掉 `if consteval`。升级到 C++23 后仍要逐项确认库实现，不要因为 `-std=c++23` 通过就假定 `print`/`stacktrace` 可用。
- 验证：`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++20`；模板在 C++20 下走 `std::format` 分支。
- 片段：[cmake-snippet.cmake](c++20/cmake-snippet.cmake)。

## C++23

- 能用：C++20 的全部内容；`std::print`/`std::println`、`std::expected`、`std::stacktrace`、`if consteval`、显式对象参数（deducing this）、`std::mdspan`、`std::flat_map`、ranges 的 C++23 增补（工具链实现为准）。
- 不能假设：C++23 在 GCC/Clang 上仍是 Partial，具体设施要查编译器状态页；`std::print` 的库门槛是 libstdc++ 14+ / libc++ 19+；`std::stacktrace` 还要链接对应库；`std::expected` 的 monadic 接口、`std::flat_map` 等设施在旧标准库上可能缺失；模板只用 `std::format`，不因为默认 C++23 就强依赖 `print`/`stacktrace`。
- 降档/升级：从 C++23 降到 C++20 见上一节；升级到 C++26 前先确认 CMake 3.25+、编译器/标准库支持、clang-format 的 `c++26` 枚举，并按 [index.md](index.md#新增标准) 的流程新增片段与矩阵行。
- 验证：`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++23`；模板在 C++23 下走 `std::format` 分支；若使用 `print`/`stacktrace`，另做链接测试。
- 片段：[cmake-snippet.cmake](c++23/cmake-snippet.cmake)。
