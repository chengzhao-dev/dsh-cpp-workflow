# 第 1 步：定 target 与标准

## 产出

一张明确的 target 图、一组 target 属性、一个与 `environment.json` 一致的语言标准。构建结果只取决于声明的组合，不取决于当前 shell 的默认值。

## 通用情况

先读 `environment.json` 的 `standard`，再把它映射成两层：

| `standard` | `target_compile_features` | `CXX_STANDARD` | CMake 最低版本 |
| --- | --- | --- | --- |
| `c++11` | `cxx_std_11` | `11` | 3.1 |
| `c++14` | `cxx_std_14` | `14` | 3.1 |
| `c++17` | `cxx_std_17` | `17` | 3.8 |
| `c++20` | `cxx_std_20` | `20` | 3.12 |
| `c++23` | `cxx_std_23` | `23` | 3.20 |

target 规则：

- 程序 target 固定叫 `app`；库 target 用组件名，程序链接库；不把 `main()` 编进库。
- 每个 target 自己声明 include、标准、编译选项和链接库；公共头用 `PUBLIC`，实现目录用 `PRIVATE`。
- 用 `target_include_directories`、`target_compile_features`、`target_link_libraries`；禁止全局 `include_directories()`、`add_definitions()`、`CMAKE_CXX_FLAGS`。
- 源文件显式列出；不写 `file(GLOB ...)`，新增文件时改 CMake。
- `set(CMAKE_EXPORT_COMPILE_COMMANDS ON)`；可执行文件输出到 `build/<compiler>/bin`，库到 `build/<compiler>/lib`。
- 需要直接运行构建产物的共享库程序，设 `BUILD_RPATH "$ORIGIN/../lib"`；Apple 用 `@loader_path/../lib`。
- 标准用项目 `cmake/` 里的 `CompileSettings_SetCxxStandard(target visibility c++NN)`；没有这个函数时先从 `assets/cmake/CompileSettings.cmake` 复制并导入，不要在每个 target 重复三属性。
- 警告用同一份 `CompileSettings.cmake` 里的 `CompileSettings_SetWarnings(target visibility LEVEL basic|standard|strict)`；`visibility` 用 `PRIVATE` 或 `INTERFACE`，不要在每个 target 重复 `-Wall` 列表。

## 命令形状

```bash
cmake -S . -B build/clang -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
```

GCC 模式把目录和编译器换成 `build/gcc`、`g++`。一个 configure 只用一个编译器；CMake 最低 3.20，低于目标标准所需版本时先升 `cmake_minimum_required`，不要静默降标准。

## 情况

**新工程**：工程模板仍由 `building-cpp` 提供，从 `../../building-cpp/assets/templates/projects/` 选形态，只复制目标工程缺的文件；模板里的 `{{PROJECT_NAME}}` 换成真实工程名，再按本节改 target 与标准。

**已有工程**：先读现有 `CMakeLists.txt`，找出全局设置、GLOB、输出目录和 target 命名；只改与当前任务相关的一处。大改前先让现有构建跑通，保留可回退点。

**库 + 程序**：库的公共 include 用 `PUBLIC` 传播；程序不直接包含库的 `src/`。静态库与动态库的 target 写法相同，动态库额外设运行时路径。

**测试**：确有第二个消费者时再加 `enable_testing()` 与 `add_subdirectory(tests)`；测试 target 只链接被测库的公共接口，没有测试时不加空测试。

**预设**：使用 preset 时名称固定 `clang` / `gcc`，与构建目录一致；没有 preset 时直接用上面的命令，不要两套并存。

下一步：target 图稳定后，进 `steps/02-modules.md` 决定哪些片段抽成函数。
