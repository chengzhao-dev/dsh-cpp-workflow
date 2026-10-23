# 第 1 步：定构建

## 产出

一组 target-based 的 CMake 规则、一个固定的构建目录、一个可用的编译数据库。构建结果只取决于 `environment.json` 声明的组合，不取决于当前 shell 碰巧有什么。

```text
CMakeLists.txt
build/
  clang/                 # compiler=clang
    compile_commands.json
  gcc/                   # compiler=gcc
    compile_commands.json
  compile_commands.json  # 指向上面的当前数据库
```

## 通用情况

先读 `environment.json`。源文件清单来自 `developing-cpp` 的定边界和定实现；定构建只把它们写进 target，不重新决定库与程序的边界。三个环境轴加语言标准分别表示：

| 轴 | 取值 | 含义 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | 编辑器与代理壳所在系统 |
| `build_host` | `native` / `wsl` | 执行编译和运行产物的环境；`native` 表示 `host` 本机，`wsl` 表示 Windows 的 WSL，且只允许 `host=windows`；`windows` + `native` 本版本不支持 |
| `compiler` | `clang` / `gcc` | 用哪个编译器；一次只配一个 |
| `standard` | `c++11`–`c++23` | 一个工程一个语言标准；新工程默认 `c++23`，已有工程按原声明 |

环境轴为空、`standard` 非法或组合非法（如 `host=linux` + `build_host=wsl`、`host=windows` + `build_host=native`）时，停在定构建，先让用户把 `environment.json` 填对。不要替用户选 WSL、Clang 或构建目录。`windows` + `native` 只给一句「本版本不能在 Windows 原生壳里构建」，不要建议改 WSL、不要提出补 PowerShell 脚本。

构建规则：

- CMake 最低 3.20；`project(... LANGUAGES CXX)`；只有确有 C 源时才写 `LANGUAGES C CXX`。新工程默认标准 C++23；已有工程按 `environment.json` 的 `standard` 或现有 target 声明，不擅自升降。
- 生成器固定单配置 Ninja，不用 Ninja Multi-Config：同一源文件会写多条命令，clangd 默认只取第一条，容易读错数据库（clangd#2026）；构建目录固定 `build/clang` 或 `build/gcc`。
- 一个 configure 只用一个编译器：`-DCMAKE_CXX_COMPILER=clang++` 或 `g++`。
- 程序 target 固定叫 `app`；库 target 用组件名，程序链接库。库与程序分开，不把 `main()` 编进库。
- 用 `target_include_directories`、`target_compile_features`、`target_link_libraries` 表达依赖；禁止全局 `include_directories()`、`add_definitions()`、`CMAKE_CXX_FLAGS` 污染所有 target。
- 库的公共 include 根用 `PUBLIC`；实现私有头用 `PRIVATE`；测试 target 只链接被测库的公共接口。头文件按 Google 规则从仓库根写完整路径，构建时把仓库根加入搜索路径，不要改成组件的 `include/` 根后再写裸文件名。
- `set(CMAKE_EXPORT_COMPILE_COMMANDS ON)`；Ninja 生成器下会产出 `compile_commands.json`。
- 输出目录统一：可执行文件到 `build/<compiler>/bin`，库到 `build/<compiler>/lib`；不要用源码目录当输出目录。
- 开启 `CMAKE_EXPORT_COMPILE_COMMANDS` 后，把 `build/<compiler>/compile_commands.json` 符号链接到 `build/compile_commands.json`，让 clangd 默认能找到当前数据库。本插件固定产出 `build/<compiler>/` 并在 `build/` 下维护链接，不生成 `out/build/`，也不把两套构建根混用。
- 目标标准写在 target 上：`target_compile_features(app PRIVATE cxx_std_23)`；库用 `PUBLIC` 传播标准。再加 `set_target_properties(... CXX_STANDARD 23 CXX_STANDARD_REQUIRED ON CXX_EXTENSIONS OFF)`：meta-feature 只保证“至少”，`CXX_STANDARD_REQUIRED` 防 decay，`CXX_EXTENSIONS OFF` 把 `-std=gnu++23` 收成 `-std=c++23`。configure 后读 `compile_commands.json` 的最后一个 `-std=`，必须与 `environment.json` 的 `standard` 一致。
- 工程确有 C 源时才写 `LANGUAGES C CXX`，并且 `CMAKE_C_COMPILER` 与 `CMAKE_CXX_COMPILER` 必须来自同一套编译器（`clang`/`clang++` 或 `gcc`/`g++`）；没有 C 源时只启用 CXX。
- 不写 `file(GLOB ...)`；源文件显式列出，新增文件时改 CMake。
- 不加 `-march=native`、`-ffast-math` 等改变语义或可移植性的选项；警告选项按团队约定统一加。
- 配置阶段不隐式下载依赖；需要 GoogleTest 时由项目显式选择固定版本、带哈希的 `FetchContent`，或使用项目自带的 cmake 模块，只把下载用于测试依赖。

命令形状：

```bash
cmake -S . -B build/clang -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build/clang
rm -f build/compile_commands.json
ln -s clang/compile_commands.json build/compile_commands.json
```

GCC 模式把目录和编译器换成 `build/gcc`、`g++`。工程确有 C 源时，再补 `-DCMAKE_C_COMPILER=clang` 或 `gcc`，和 C++ 编译器同属一套。每次构建都重新 configure；不要依赖上一次的缓存。

## 情况

**新工程**：从 `assets/templates/projects/` 选形态：`single` 单文件、`multi` 多文件单程序、`static-library` 静态库 + 程序、`shared-library` 动态库 + 程序。只复制目标工程缺的文件；已有的 `CMakeLists.txt`、`.clang-*`、源码不覆盖。模板里的 `{{PROJECT_NAME}}` 换成真实工程名，默认标准 C++23；四套模板已按 `__cplusplus` 条件使用 `std::format`，把 `standard`、`cxx_std_*`、`CXX_STANDARD` 和 `.clang-format` 的解析档位一起降到 C++11–C++20 后仍应能构建，降完跑 `references/standards/README.md` 的五档矩阵。模板源码是 `.cc`，头文件用路径式 `#define` 守卫；新增文件沿用 `.cc` / `.h`，已有工程保持原有扩展名。

**已有工程**：先读现有 `CMakeLists.txt`，找出全局设置、GLOB、输出目录和 target 命名；只改与当前任务相关的一处。大改前先让通过检查的项目入口跑通，保留可回退点。

**库 + 程序**：库 target 的 `PUBLIC` include 根按项目约定设置；本工作流把仓库根作为源码根，程序按 `#include "component/include/name.h"` 包含公共头，不直接包含库的 `src/`。静态库与动态库的接口相同；动态库额外设置运行时库路径。

**测试**：`enable_testing()` 放在顶层，`add_subdirectory(tests)` 在 `add_subdirectory(<component>)` 之后；测试 target 用 `add_test(NAME ... COMMAND ...)` 注册。没有测试时不要为了「看起来完整」加空测试。

**CMakePresets**：如果项目使用 preset，名称固定 `clang` / `gcc`，与构建目录一致；没有 preset 时直接用上面的命令，不要两套并存。

## 正反例指针

- 全局 include、GLOB、把 `main()` 编进库：`examples/cmake.md`。
- 正确的最小库 + 程序：`examples/cmake.md`「最小可用形状」。
- target 与目录的完整说明：`references/cmake.md`。
- 五档标准的下限、降档替换和工具映射：`references/standards/README.md`。
