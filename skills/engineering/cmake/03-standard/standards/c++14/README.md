# C++14 标准档案

[返回标准索引](../README.md)

| 项 | 值 |
| --- | --- |
| `standard` | `c++14` |
| CMake meta-feature | `cxx_std_14` |
| `CXX_STANDARD` | `14` |
| `__cplusplus` | `201402L` |
| clang-format 21/22 | `Standard: c++14` |
| 模板实用下限 | GCC 5 / Clang 3.4 |

## 最重要的三件事

1. C++14 只多出 `std::make_unique`、泛型 lambda、放宽的 `constexpr` 等；不要顺手用 C++17 的 `string_view`/`optional`。
2. `std::make_unique` 是这一档最常用的替换点，但不要把 C++11 的 `std::unique_ptr(new T)` 直接当成跨档写法。
3. 同样用 `CXX_STANDARD 14` + `REQUIRED ON` 锁定模式，并检查 `compile_commands.json` 是 `-std=c++14`。

## 本档能用

- C++11 的全部内容。
- `std::make_unique`、泛型 lambda、变量模板、返回类型推导。
- 二进制字面量、数字分隔符、放宽的 `constexpr`、`std::integer_sequence`。

## 本档不能假设

- 没有 `std::string_view`、`std::optional`、`std::variant`、`if constexpr`、结构化绑定。
- 没有 `[[nodiscard]]`、`std::filesystem`、`std::format`、`std::print`。
- 不要把结构化绑定或 `if constexpr` 写进 C++14 代码再靠编译器扩展通过。

## CMake

把 [cmake-snippet.cmake](cmake-snippet.cmake) 的 target 名换成实际 target。

## 工具

- `.clang-format`：`Standard: c++14`。
- `.clangd`：不写 `-std`，从 `compile_commands.json` 读。
- `.clang-tidy`：仍用 Google 基线；命名规则不要引入 C++17 属性。

## 降档/升级

从 C++17 降到这里时，把 `string_view` 改成 `const std::string&`，把 `optional` 改成 `bool` + 输出参数或项目结果类型，把 `if constexpr` 改成标签分派或重载。升级到 C++17 后也不要立刻把公共接口全改成 `string_view`，先看调用方生命周期。

## 验证

configure、build、run 必测；`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++14`。模板在 C++14 下应走字符串拼接实现。
