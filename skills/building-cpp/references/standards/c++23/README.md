# C++23 标准档案

[返回标准索引](../README.md)

| 项 | 值 |
| --- | --- |
| `standard` | `c++23` |
| CMake meta-feature | `cxx_std_23` |
| `CXX_STANDARD` | `23` |
| `__cplusplus` | `202302L` |
| clang-format 21/22 | `Standard: Latest` |
| 模板实用下限 | GCC 13 / Clang 17（模板只用 `std::format`） |

## 最重要的三件事

1. C++23 在 GCC/Clang 上仍是 Partial；`std::print` 要 libstdc++ 14+/libc++ 19+，`std::stacktrace` 还要链接库。
2. clang-format 21/22 不认识 `c++23`，配置写 `Standard: Latest`；`.clangd` 不写 `-std`，否则会把编译数据库降回 C++20。
3. 模板默认 23，但模板只强依赖 `std::format`；不要因为默认 23 就在公共头里用 `std::expected`/`std::print`，先确认所有 target 和库门槛。

## 本档能用

- C++20 的全部内容。
- `std::print` / `std::println`、`std::expected`、`std::stacktrace`。
- `if consteval`、显式对象参数（deducing this）、`std::mdspan`、`std::flat_map`。
- ranges 的 C++23 增补（工具链实现为准）。

## 本档不能假设

- C++23 在 GCC/Clang 上仍是 Partial：具体设施要查编译器状态页，不能只看 `-std=c++23`。
- `std::print` 的库门槛是 libstdc++ 14+ / libc++ 19+；`std::stacktrace` 还要链接对应库，链接失败不是语法错误。
- `std::expected` 的 monadic 接口、`std::flat_map` 等设施在旧标准库上可能缺失。
- 模板只用 `std::format`，不会因为默认 C++23 就强依赖 `print`/`stacktrace`。

## CMake

把 [cmake-snippet.cmake](cmake-snippet.cmake) 的 target 名换成实际 target。默认模板的 `cxx_std_23` 和 `CXX_STANDARD 23` 必须与 `environment.json` 的 `standard` 一致。

## 工具

- `.clang-format`：`Standard: Latest`（21/22 不接受 `c++23`；`Latest` 按工具支持的最高标准解析）。
- `.clangd`：不写 `-std`，从 `compile_commands.json` 读；写死 `-std=c++20` 会让 `<print>` 和 `if consteval` 解析失败。
- `.clang-tidy`：Google 基线；不要因为 C++23 就打开 `cppcoreguidelines-*` 整包。

## 降档/升级

从 C++23 降到 C++20 见 [C++20 档案](../c++20/README.md)。升级到 C++26 前先确认 CMake 3.25+、编译器/标准库支持、clang-format 的 `c++26` 枚举；新增目录流程见 [标准索引](../README.md#新增标准)。

## 验证

configure、build、run 必测；`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++23`。模板在 C++23 下走 `std::format` 分支；若使用 `print`/`stacktrace`，另做链接测试。
