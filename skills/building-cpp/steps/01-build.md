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

先读项目技能与 `environment.json`，再确认 `engineering` 已经把 target 图、公共 include、语言标准和输出目录写进 CMake。target 缺失、标准不对、include 或链接边界没写时，停止本步，转 `engineering` 的定 target 与标准；不要在这里用全局变量或临时 `-std` 绕过。 只在需要核对时打开 `../../engineering/references/cmake/targets/01-target-rules.md` 或 `../../engineering/references/cmake/standards/01-cxx-standard.md` 被点名的一份；CMake 的写改仍由 `engineering` 落笔。

## 环境

| 轴 | 取值 | 含义 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | 编辑器与代理壳所在系统 |
| `build_host` | `native` / `wsl` | 执行编译和运行产物的环境；`wsl` 只允许 `host=windows`；`windows` + `native` 本版本不支持 |
| `compiler` | `clang` / `gcc` | 用哪个编译器；一次只配一个 |
| `standard` | `c++11`–`c++23` | 一个工程一个语言标准；新工程默认 `c++23`，已有工程按原声明 |

声明是否合法的唯一判据是 `../references/02-environment.md`「合法组合」：非法时停在定构建，让用户把 `environment.json` 填对；`standard` 缺失按默认 `c++23` 继续并提示升级；`windows` + `native` 只给一句「本版本不能在 Windows 原生壳里构建」。不要替用户选 WSL、Clang 或构建目录。

## 规则

- 生成器固定单配置 Ninja，不用 Ninja Multi-Config：同一源文件会写多条命令，读数据库时容易误选；构建目录固定 `build/clang` 或 `build/gcc`，项目技能声明单一构建目录时以项目目录为准。
- 一个 configure 只用一个编译器：`-DCMAKE_CXX_COMPILER=clang++` 或 `g++`；确有 C 源时 C 编译器与 C++ 编译器同属一套。
- `set(CMAKE_EXPORT_COMPILE_COMMANDS ON)` 由 `engineering` 写在顶层；Ninja 下产出 `compile_commands.json`。
- 输出目录由 `engineering` 统一设到 `build/<compiler>/bin` 与 `build/<compiler>/lib`；本步只核对，不重复设。
- 配置后把 `build/<compiler>/compile_commands.json` 符号链接到 `build/compile_commands.json`，让 clangd 默认能找到当前数据库；换编译器时重建链接。项目声明单一构建目录时数据库就在该目录，不建这条链接（见 `../references/02-environment.md`「构建目录」的「单一目录」行）。
- 不写全局 `CMAKE_CXX_FLAGS`、`include_directories()` 或 `add_definitions()`；这些属于 target 契约，发现就转 `engineering`。
- 配置阶段不隐式下载依赖；测试框架由项目显式选择固定版本、带哈希的 `FetchContent`，或使用项目自带模块。

## 命令

```bash
cmake -S . -B build/clang -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_C_COMPILER=clang \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build/clang
# 只有构建目录不是 build/ 时才建链接；单一构建目录时跳过这两行
rm -f build/compile_commands.json
ln -s clang/compile_commands.json build/compile_commands.json
```

GCC 模式把目录和编译器换成 `build/gcc`、`g++`（C 驱动换成 `gcc`）。每次构建都重新 configure；不要依赖上一次缓存。C 与 C++ 驱动一起换，不要只换 C++ 驱动。

## 情况

**新工程**：从 `../assets/templates/projects/` 选形态；把 `../assets/templates/projects/common/running-build.sh` 复制到工程根，`chmod +x` 并用 `bash -n` 验证语法；在 `.agents/skills/cpp-workflow-project/environment.json` 写出四个字段（`host`、`build_host`、`compiler`、`standard`），取值与组合见 `../references/02-environment.md`，不要替用户选。模板缺 target 时先转 `engineering`，target 齐了再 configure。

**已有工程**：先读现有 `CMakeLists.txt`，只核对 target、标准与输出目录；不改与当前任务无关的 target，大改前先让现有构建跑通。

**测试**：`enable_testing()` 与 `add_subdirectory(tests)` 的顺序由 `engineering` 定；本步不跑 CTest，CTest 在通过检查里跑；不在没有测试时加空测试。

**CMakePresets**：如果项目使用 preset，名称固定 `clang` / `gcc`，与构建目录一致；没有 preset 时直接用上面的命令。

下一步：构建可用后，进 `steps/02-tooling.md` 配格式、静态检查与 clangd。
