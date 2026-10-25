# 第 1 步：定构建

## 产出

一个固定的构建目录、一个可用的编译数据库、一组可复现的配置与构建命令。构建结果只取决于 `environment.json` 声明的组合，不取决于当前 shell 碰巧有什么。

```text
build/
  clang/                 # compiler=clang
    compile_commands.json
  gcc/                   # compiler=gcc
    compile_commands.json
  compile_commands.json  # 指向上面的当前数据库
```

## 前置

先读项目技能与 `environment.json`，再确认 `configuring-cmake` 已经把 target 图、公共 include、语言标准和输出目录写进 CMake。target 缺失、标准不对、include 或链接边界没写时，停止本步，转 `configuring-cmake` 的定 target 与标准；不要在这里用全局变量或临时 `-std` 绕过。

## 环境

| 轴 | 取值 | 含义 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | 编辑器与代理壳所在系统 |
| `build_host` | `native` / `wsl` | 执行编译和运行产物的环境；`wsl` 只允许 `host=windows`；`windows` + `native` 本版本不支持 |
| `compiler` | `clang` / `gcc` | 用哪个编译器；一次只配一个 |
| `standard` | `c++11`–`c++23` | 一个工程一个语言标准；新工程默认 `c++23`，已有工程按原声明 |

环境轴为空、`standard` 非法或组合非法时，停在定构建，先让用户把 `environment.json` 填对。不要替用户选 WSL、Clang 或构建目录。`windows` + `native` 只给一句「本版本不能在 Windows 原生壳里构建」。

## 规则

- 生成器固定单配置 Ninja，不用 Ninja Multi-Config：同一源文件会写多条命令，clangd 默认只取第一条，容易读错数据库；构建目录固定 `build/clang` 或 `build/gcc`。
- 一个 configure 只用一个编译器：`-DCMAKE_CXX_COMPILER=clang++` 或 `g++`；确有 C 源时 C 编译器与 C++ 编译器同属一套。
- `set(CMAKE_EXPORT_COMPILE_COMMANDS ON)` 由 `configuring-cmake` 写在顶层；Ninja 下产出 `compile_commands.json`。
- 输出目录由 `configuring-cmake` 统一设到 `build/<compiler>/bin` 与 `build/<compiler>/lib`；本步只核对，不重复设。
- 配置后把 `build/<compiler>/compile_commands.json` 符号链接到 `build/compile_commands.json`，让 clangd 默认能找到当前数据库；换编译器时重建链接。
- 不写全局 `CMAKE_CXX_FLAGS`、`include_directories()` 或 `add_definitions()`；这些属于 target 契约，发现就转 `configuring-cmake`。
- 配置阶段不隐式下载依赖；测试框架由项目显式选择固定版本、带哈希的 `FetchContent`，或使用项目自带模块。

## 命令

```bash
cmake -S . -B build/clang -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build/clang
rm -f build/compile_commands.json
ln -s clang/compile_commands.json build/compile_commands.json
```

GCC 模式把目录和编译器换成 `build/gcc`、`g++`。每次构建都重新 configure；不要依赖上一次缓存。

## 情况

**新工程**：从 `../assets/templates/projects/` 选形态；模板缺 target 时先转 `configuring-cmake`，target 齐了再 configure。

**已有工程**：先读现有 `CMakeLists.txt`，只核对 target、标准与输出目录；不改与当前任务无关的 target，大改前先让现有构建跑通。

**测试**：`enable_testing()` 与 `add_subdirectory(tests)` 的顺序由 `configuring-cmake` 定；本步只跑 CTest，不在没有测试时加空测试。

**CMakePresets**：如果项目使用 preset，名称固定 `clang` / `gcc`，与构建目录一致；没有 preset 时直接用上面的命令。

下一步：构建可用后，进 `steps/02-tooling.md` 配格式、静态检查与 clangd。
