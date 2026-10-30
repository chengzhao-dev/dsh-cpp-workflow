# C++17 标准档案

[返回标准索引](../README.md)

| 项 | 值 |
| --- | --- |
| `standard` | `c++17` |
| CMake meta-feature | `cxx_std_17` |
| `CXX_STANDARD` | `17` |
| `__cplusplus` | `201703L` |
| clang-format 21/22 | `Standard: c++17` |
| 模板实用下限 | GCC 7 / Clang 5（语言核心） |

## 最重要的三件事

1. `std::string_view`/`std::optional`/`std::variant`/`if constexpr` 是这一档的主力；它们不能出现在 C++11/14 档案里。
2. 还没有 `std::format`；字符串拼接/`ostringstream` 仍是这一档的默认写法。
3. `std::filesystem` 在旧 GCC 上要额外链接 `stdc++fs`，先查工具链再写进 CMake。

## 本档能用

- C++14 的全部内容。
- `std::string_view`、`std::optional`、`std::variant`、`std::any`。
- `if constexpr`、结构化绑定、`[[nodiscard]]`、内联变量、嵌套命名空间。
- `std::filesystem`、并行算法（库实现和链接方式另看）。

## 本档不能假设

- 没有 concepts、ranges、`std::format`、`std::span`、`std::bit_cast`。
- 没有 `std::print`、`std::expected`、`std::stacktrace`。
- 没有 `= default` 的比较运算符。
- `std::filesystem` 在 GCC 8 需要额外链接 `stdc++fs`，GCC 9 起才稳定；不要把“语言核心达标”当成文件系统库也达标。

## CMake

把 [cmake-snippet.cmake](cmake-snippet.cmake) 的 target 名换成实际 target。用到 `std::filesystem` 且工具链较老时，在 target 上补 `stdc++fs`，不要全局加链接选项。

## 工具

- `.clang-format`：`Standard: c++17`。
- `.clangd`：不写 `-std`，从 `compile_commands.json` 读。
- `.clang-tidy`：Google 基线；`[[nodiscard]]` 可以开始用于公共查询。

## 降档/升级

从 C++20 降到这里时，把 concepts 改成 `enable_if`/重载，把 ranges 改成迭代器算法，把 `std::format` 改成 `std::ostringstream`，把 `= default` 的比较运算符改回结构体外的手写自由函数。升级到 C++20 后先确认 `std::format` 的库门槛（libstdc++ 13+ / libc++ 14+），不要只看编译器版本。

## 验证

configure、build、run 必测；`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++17`。模板在 C++17 下仍走字符串拼接实现。
