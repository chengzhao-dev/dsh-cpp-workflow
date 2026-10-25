# 语言标准档案

本工作流默认 **C++23**，但一个工程只选一个 `standard`，不为同一份源码承诺“同时兼容 C++11–C++23”。标准是项目级事实，写在 `.agents/skills/cpp-workflow-project/environment.json`。

每个标准单独一个目录：`c++11/`、`c++14/`、`c++17/`、`c++20/`、`c++23/`。目录里放这一档自己的编译器下限、语言/库设施、CMake 片段和工具映射；模板仍然只有一套公共骨架，靠 `__cplusplus` 条件选择实现，不复制五份模板。

Google C++ Style Guide 上游仍写 “target C++20”，本工作流默认 C++23 是一处明确偏离；Google 的排版、命名、头文件和异常之外的规则不变。异常政策仍按 [exceptions.md](../../../developing-cpp/references/exceptions.md)。

## 选择标准

| 标准 | 目录 | 一句话 |
| --- | --- | --- |
| C++11 | [c++11/README.md](c++11/README.md) | 老工具链、老库仍要维护时的最低档 |
| C++14 | [c++14/README.md](c++14/README.md) | 需要 `make_unique`、泛型 lambda，但还不想上 C++17 |
| C++17 | [c++17/README.md](c++17/README.md) | 需要 `string_view`、`optional`、`if constexpr` 的稳定基线 |
| C++20 | [c++20/README.md](c++20/README.md) | 需要 concepts、ranges、`std::format` 的现代基线 |
| C++23 | [c++23/README.md](c++23/README.md) | 本工作流默认；需要 `print`、`expected` 等设施时选它 |

新工程写 `c++23`；已有工程按现有 `CMakeLists.txt` 和编译器能力选，不为了“统一”擅自升降。降档前先读对应目录的“不能假设”和“降档要改什么”。

## 三个规划粒度

| 粒度 | 先看 | 产出 |
| --- | --- | --- |
| 项目 | 本页选择表、编译器/库门槛 | `environment.json` 的 `standard`，以及“为什么选这档” |
| target | 该档的 `cmake-snippet.cmake` | `cxx_std_*`、`CXX_STANDARD`、`CXX_STANDARD_REQUIRED`、`CXX_EXTENSIONS` |
| 代码/工具 | 该档 README 的“能用/不能假设/降档” | 设施替换、`.clang-format` 档位、`.clangd` 不写 `-std` |
| 验证 | 本页验证矩阵、`scripts/checking-standard-matrix.sh` | configure/build/CTest 和 `compile_commands.json` 的精确 `-std` |

每个标准目录都按这四层写；不要只在项目层改 `standard`，却在 target 层留着 C++23 的 `cxx_std_23`。

## 共用矩阵

| `standard` | CMake meta-feature | `CXX_STANDARD` | `__cplusplus` | clang-format 21/22 | 模板实用下限（含标准库设施） |
| --- | --- | --- | --- | --- | --- |
| `c++11` | `cxx_std_11` | 11 | `201103L` | `c++11` | GCC 4.8 / Clang 3.4 |
| `c++14` | `cxx_std_14` | 14 | `201402L` | `c++14` | GCC 5 / Clang 3.4 |
| `c++17` | `cxx_std_17` | 17 | `201703L` | `c++17` | GCC 7 / Clang 5 |
| `c++20` | `cxx_std_20` | 20 | `202002L` | `c++20` | GCC 13 / Clang 16（`std::format`） |
| `c++23` | `cxx_std_23` | 23 | `202302L` | `Latest` | GCC 13 / Clang 17（模板只用 `std::format`） |

“语言核心最低编译器”只保证语法和核心库；标准库设施要单独看：

| 设施 | 标准 | 额外门槛 |
| --- | --- | --- |
| `std::string_view`、`std::optional`、`std::variant`、`if constexpr` | C++17 | 随语言核心 |
| `std::format` | C++20 | libstdc++ 13+；libc++ 14+（特性宏到 19 才稳定） |
| `std::print`、`std::expected`、`std::stacktrace` | C++23 | `std::print`：libstdc++ 14+、libc++ 19+；`std::expected` 随各库 C++23 实现；`std::stacktrace` 还要链接对应库 |

Clang/GCC 的 “Partial” 状态意味着 C++23 不是全量实现。用到具体设施前，先查：

- [GCC C++ status](https://gcc.gnu.org/projects/cxx-status.html)
- [Clang C++ status](https://clang.llvm.org/cxx_status.html)
- [cppreference C++23 compiler support](https://en.cppreference.com/w/cpp/compiler_support/23)

## 共用规则

### CMake

每个 target 同时写 meta-feature 和精确属性；片段见各标准目录的 `cmake-snippet.cmake`，把 target 名换成实际 target：

```cmake
target_compile_features(app PRIVATE cxx_std_23)
set_target_properties(app PROPERTIES
  CXX_STANDARD 23
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
```

- `cxx_std_23` 是“至少”，会向依赖它的 target 传播。
- `CXX_STANDARD` 是请求值；`CXX_STANDARD_REQUIRED ON` 防止编译器不支持时静默 decay。
- `CXX_EXTENSIONS OFF` 把 `-std=gnu++23` 收成 `-std=c++23`。
- configure 后读 `compile_commands.json` 的最后一个 `-std=`；必须是 `-std=c++NN`，不能是 `gnu++NN`。
- CMake 最低 3.20（模板统一要求）；只单独使用低档片段时，C++11/14 的 `cxx_std_*` meta-feature 最低 3.8，C++20 为 3.12。C++23 的 `CXX_STANDARD 23` 自 3.20 才有。

### clang-format

clang-format 21/22 的 `Standard` 只到 `c++20`。映射：

| 声明 | 配置 |
| --- | --- |
| `c++11`–`c++20` | 对应 `Standard: c++NN` |
| `c++23` | `Standard: Latest`（21/22 没有 `c++23`） |
| `c++26`（未来） | 工具支持时写 `c++26`，否则 `Latest` |

不要为了“看起来精确”写 `c++23`；clang-format 21 会报 `unknown enumerated scalar` 并退出 1。

### clangd

`.clangd` **不写 `-std`**。clangd 从 `compile_commands.json` 读标准；写死 `-std=c++20` 会把 C++23 工程降级，表现为 `<print>` 不存在、`if consteval` 解析失败。

只保留：

```yaml
CompileFlags:
  CompilationDatabase: build/clang
```

切换编译器时改目录；没有数据库时先回到定构建生成。

### clang-tidy

`.clang-tidy` 不写标准，标准来自编译数据库。检查项保持 Google 基线：

```yaml
Checks: '-*, google-*, readability-identifier-naming'
WarningsAsErrors: '*'
FormatStyle: file
```

低标准工程不要为了通过检查去打开 `cppcoreguidelines-*` 整包；那会把 C++ Core Guidelines 的现代写法带进 C++11 代码。

### 标准库

默认用系统默认标准库。需要 libc++ 时，在 CMake 工具链文件或 target 选项里显式写：

```cmake
target_compile_options(app PRIVATE -stdlib=libc++)
target_link_options(app PRIVATE -stdlib=libc++)
```

不要只写进某个人的 `.clangd` 或 shell 脚本；换机器后不可复现。

## 降档时改什么

默认模板按 `__cplusplus` 条件使用 `std::format`；选低标准仍不是只改一个数字：

| 从默认 C++23 降到 | 必须处理 |
| --- | --- |
| `c++20` | `std::print` → `std::format` + `std::cout`；`std::expected` → `std::optional`/结果类型 |
| `c++17` | 再去掉 `std::format`，用 `std::ostringstream`；去掉 `std::span`、`std::bit_cast` |
| `c++14` | 去掉 `std::string_view`、`[[nodiscard]]`、结构化绑定、`if constexpr`、`std::optional` |
| `c++11` | 再去掉通用 lambda、`std::make_unique`、`std::index_sequence`、`constexpr` 放宽用法 |

每个标准目录里的“不能假设”和“降档要改什么”是该档的检查清单；模板只保证自身能构建，不替项目代码做兼容层。

## 验证矩阵

| 标准 | configure | build | run | compile_commands `-std` | clang-format | clangd |
| --- | --- | --- | --- | --- | --- | --- |
| `c++11` | 必测 | 必测 | 必测 | `c++11` | `c++11` | 读 DB |
| `c++14` | 必测 | 必测 | 必测 | `c++14` | `c++14` | 读 DB |
| `c++17` | 必测 | 必测 | 必测 | `c++17` | `c++17` | 读 DB |
| `c++20` | 必测 | 必测 | 必测 | `c++20` | `c++20` | 读 DB |
| `c++23` | 必测 | 必测 | 必测 | `c++23` | `Latest` | 读 DB |

本仓库在 WSL（clang 21.1.8、CMake 4.2.3、Ninja 1.13.2）上跑过四套模板 × 五档共 20 个构建：single、multi、static-library、shared-library 全部 configure/build/CTest 通过，`compile_commands.json` 都得到精确的 `-std=c++11/14/17/20/23`。模板用 `__cplusplus` 条件选择 `std::format` 或字符串拼接，默认仍交付 C++23。可复现脚本：[checking-standard-matrix.sh](../../../../scripts/checking-standard-matrix.sh)。

## 新增标准

增加 C++26 或更高标准时，不复制模板，按这个顺序做：

1. 新建 `standards/c++26/`，写 `README.md`，复制对应档的 `cmake-snippet.cmake` 并改数字。
2. 更新本页矩阵和 `checking-environment.mjs` 的 `STANDARDS`。
3. 确认 CMake 的 `CXX_STANDARD 26`、clang-format 的 `Standard` 能力、编译器/标准库门槛。
4. 在四套模板 × 新档上跑 configure/build/CTest，并在 `compile_commands.json` 核对 `-std=c++26`。
5. 只在新档稳定后改默认；默认变更属于发布说明里要写清的破坏性变化。

## 相关文件

- [environment.md](../environment.md)：四轴声明与校验。
- [configuring-cmake/references/cxx-standard.md](../../../configuring-cmake/references/cxx-standard.md)：C++11–C++23 在 CMake 里的两层声明与验证。
- [static-analysis.md](../static-analysis.md)：clang-format / clang-tidy / clangd 分工。
- [01-build.md](../../steps/01-build.md)：定构建步骤。
