# C++20 标准档案

[返回标准索引](../README.md)

| 项 | 值 |
| --- | --- |
| `standard` | `c++20` |
| CMake meta-feature | `cxx_std_20` |
| `CXX_STANDARD` | `20` |
| `__cplusplus` | `202002L` |
| clang-format 21/22 | `Standard: c++20` |
| 模板实用下限 | GCC 13 / Clang 16（`std::format`） |

## 最重要的三件事

1. `std::format` 是这一档的库门槛：libstdc++ 13+，libc++ 14+（特性宏到 19 才稳定），不是有 `-std=c++20` 就自动可用。
2. concepts/ranges/`std::span`/`std::bit_cast` 可以用；`std::print`、`std::expected`、`if consteval` 仍不能假设。
3. 模板在 `__cplusplus >= 202002L` 时切到 `std::format`；降回 C++17 时必须把它换回 `std::ostringstream`。

## 本档能用

- C++17 的全部内容。
- concepts、requires、ranges、`std::span`、`std::bit_cast`、`std::source_location`。
- `std::format`、协程、`std::jthread`、三路比较。
- 模块语法（工具链支持不完整，模板不使用）。

## 本档不能假设

- 没有 `std::print`、`std::expected`、`std::stacktrace`、`if consteval`、显式对象参数。
- `std::format` 不只看语言核心：libstdc++ 13+；libc++ 14+ 实现完成，但特性宏到 19 才稳定。
- 模块、协程的构建支持因编译器/构建系统而异；模板不依赖它们。

## CMake

把 [cmake-snippet.cmake](cmake-snippet.cmake) 的 target 名换成实际 target。模板从这一档开始会在 `__cplusplus >= 202002L` 时使用 `std::format`，此前用字符串拼接。

## 工具

- `.clang-format`：`Standard: c++20`。
- `.clangd`：不写 `-std`，从 `compile_commands.json` 读。
- `.clang-tidy`：Google 基线；不要为了 concepts 打开一整族非 Google 检查。

## 降档/升级

从 C++23 降到这里时，把 `std::print` 改成 `std::format` + `std::cout`，把 `std::expected` 改成 `std::optional` 或项目结果类型，去掉 `if consteval`。升级到 C++23 后仍要逐项确认库实现，不要因为 `-std=c++23` 通过就假定 `print`/`stacktrace` 可用。

## 验证

configure、build、run 必测；`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++20`。模板在 C++20 下应走 `std::format` 分支。
