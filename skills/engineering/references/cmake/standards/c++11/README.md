# C++11 标准档案

[返回标准索引](../README.md)

| 项 | 值 |
| --- | --- |
| `standard` | `c++11` |
| CMake meta-feature | `cxx_std_11` |
| `CXX_STANDARD` | `11` |
| `__cplusplus` | `201103L` |
| clang-format 21/22 | `Standard: c++11` |
| 模板实用下限 | GCC 4.8 / Clang 3.4 |

## 最重要的三件事

1. 代码只用 C++11 子集：没有 `std::make_unique`、通用 lambda、`std::string_view`、`std::optional`、`if constexpr`。
2. CMake 同时写 `cxx_std_11` 和 `CXX_STANDARD 11`，并开 `CXX_STANDARD_REQUIRED ON`；只写 `cxx_std_11` 可能被更高默认标准满足。
3. 验证时读 `compile_commands.json`，确认实际是 `-std=c++11`，不是 `gnu++11` 或更高的 `-std`。

## 本档能用

- `auto`、范围 `for`、lambda、右值引用与移动语义。
- `std::unique_ptr`、`std::shared_ptr`、`std::thread`、`std::chrono`。
- `enum class`、`override` / `final`、变参模板、`constexpr` 的受限用法。
- `std::array`、`std::unordered_map` / `unordered_set`。

## 本档不能假设

- 没有 `std::make_unique`、泛型 lambda、变量模板、返回类型推导。
- 没有 `std::string_view`、`std::optional`、`std::variant`、`if constexpr`、结构化绑定。
- 没有 `[[nodiscard]]`、`std::filesystem`、`std::format`、`std::print`。
- 不要用 C++14 的放宽 `constexpr` 写循环或多语句函数。

## CMake

把 [cmake-snippet.cmake](cmake-snippet.cmake) 的 target 名换成实际 target。新建工程仍建议 CMake ≥ 3.20；低版本工具链只影响 `CXX_STANDARD` 的可用性，不影响本工作流的目录约定。

## 工具

- `.clang-format`：`Standard: c++11`。
- `.clangd`：不写 `-std`，从 `compile_commands.json` 读。
- `.clang-tidy`：仍用 Google 基线；不要打开 `cppcoreguidelines-*` 整包。

## 降档/升级

这是最低档，没有“再降”的路径。从 C++14 降到这里时，先去掉 `std::make_unique`、泛型 lambda、返回类型推导和变量模板；`std::unique_ptr<T>(new T(...))` 只作为过渡，不要在新代码里扩散。

## 验证

configure、build、run 必测；`compile_commands.json` 的最后一个 `-std=` 必须是 `-std=c++11`，不能是 `gnu++11`。模板的 `__cplusplus` 分支在 C++11 下应走字符串拼接实现。
