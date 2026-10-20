# CMake

目标：一个编译器、Ninja、target-based 规则、可用的编译数据库。下面是最小形状和常见边界；模板在 `assets/templates/projects/`。

## 最小可用形状

### 单文件

```cmake
cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

add_executable(app src/main.cpp)
target_compile_features(app PRIVATE cxx_std_20)
set_target_properties(app PROPERTIES CXX_EXTENSIONS OFF)
target_compile_options(app PRIVATE -Wall -Wextra -Werror)
```

### 库 + 程序

```cmake
cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

add_subdirectory(greeting)

add_executable(app src/main.cpp)
target_compile_features(app PRIVATE cxx_std_20)
set_target_properties(app PROPERTIES CXX_EXTENSIONS OFF)
target_link_libraries(app PRIVATE greeting)
target_compile_options(app PRIVATE -Wall -Wextra -Werror)
```

```cmake
# greeting/CMakeLists.txt
add_library(greeting STATIC src/greeting.cpp)
target_include_directories(greeting PUBLIC include)
target_compile_features(greeting PUBLIC cxx_std_20)
set_target_properties(greeting PROPERTIES CXX_EXTENSIONS OFF)
target_compile_options(greeting PRIVATE -Wall -Wextra -Werror -Wold-style-cast -Wshadow)
```

- 库的 `PUBLIC include` 让程序能 `#include "greeting.h"`，不需要程序再写 include 路径。
- `cxx_std_20` 用 `PUBLIC` 从库传播；程序自己再加一次也无害。
- `CXX_EXTENSIONS OFF` 把 `-std=gnu++20` 收成 `-std=c++20`，与 Google 的「不用非标准扩展」一致；每个 target 都要设。
- 程序 target 固定 `app`；库 target 用组件名。

## target-based 规则

- 每个 target 自己声明 include、标准、编译选项、链接库；不要用全局 `include_directories()`、`add_definitions()`、`CMAKE_CXX_FLAGS` 给所有 target 加料。
- `target_include_directories(<target> PUBLIC|PRIVATE <dir>)`：公共头给 `PUBLIC`，私有实现目录给 `PRIVATE`。
- `target_compile_features(<target> PUBLIC cxx_std_20)`：标准是 target 属性，不是全局开关。
- `target_link_libraries(<target> PRIVATE|PUBLIC <lib>)`：实现依赖用 `PRIVATE`，接口依赖用 `PUBLIC`。
- 不要 `file(GLOB ...)`；显式列源文件，新增文件时改 CMake，构建系统才知道。
- 不把 `main()` 编进库；程序只做装配和 I/O。
- 头文件不参与编译时，不需要 `target_sources` 列出；需要 IDE 展示时再列。

## 编译数据库

```cmake
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
```

- 只对 Makefile 和 Ninja 生成器生效；本项目固定 Ninja。
- 生成位置是构建目录根部：`build/<compiler>/compile_commands.json`。
- 构建脚本把它链接到 `build/compile_commands.json`；clangd 默认读这个路径，clang-tidy 用 `-p build/<compiler>`。
- 换编译器时，旧目录的数据库不能复用；清理或换目录。

## 输出目录

```cmake
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
```

- 可执行文件统一到 `build/<compiler>/bin`；库到 `build/<compiler>/lib`。
- 不要输出到源码目录；`git status` 不应出现构建产物。
- 运行程序时从 `build/<compiler>/bin` 启动，或由脚本设置工作目录。

## 共享库运行时路径

```cmake
if(APPLE)
  set_target_properties(app PROPERTIES BUILD_RPATH "@loader_path/../lib")
else()
  set_target_properties(app PROPERTIES BUILD_RPATH "$ORIGIN/../lib")
endif()
```

- 只对需要直接运行构建产物的程序设置；安装规则另算。
- 不要用全局 `LD_LIBRARY_PATH` 包装所有命令；脚本只在测试/运行共享库时设置。
- `$ORIGIN` 在 CMake 字符串里要转义成 `\$ORIGIN` 吗？在双引号里 `$ORIGIN` 会被 CMake 当变量；写成 `"$ORIGIN/../lib"` 在 CMake 中 `$ORIGIN` 不是 `${...}`，不会被展开，保持字面量。若遇到展开问题，用 `"\$ORIGIN/../lib"`。

## 警告与静态检查

- 警告选项统一：`-Wall -Wextra -Werror`；库额外 `-Wold-style-cast -Wshadow`。
- 不要把警告选项加到全局 `CMAKE_CXX_FLAGS`；每个 target 显式加，或用一个函数统一施加。
- `clang-tidy` 在构建后单独跑，不挂进 CMake 的编译命令；这样编译数据库稳定，诊断可复现。
- 需要 `clang-tidy` 集成时用 `CMAKE_CXX_CLANG_TIDY`，但本项目默认不启用，避免构建与检查耦合。

## GoogleTest

需要测试框架时，用固定版本的 `FetchContent`：

```cmake
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.17.0.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)
```

- 版本固定，不用 `master`；URL 和哈希写在一起，避免供应链漂移。
- 只在 `tests/` 需要时拉取；库和程序不依赖测试框架。
- 没有网络时，项目可以自带 vendored 副本；不要构建时静默跳过测试。

## 模板选择

| 模板 | 何时用 | 关键文件 |
| --- | --- | --- |
| `single` | 一个 `main.cpp`，辅助函数很少 | `CMakeLists.txt`, `src/main.cpp` |
| `multi` | 多个源文件，一个程序 | `CMakeLists.txt`, `include/`, `src/` |
| `static-library` | 库需要被测试或第二个程序链接 | 根 + `greeting/` 子目录 |
| `shared-library` | 需要运行时加载/替换 | 同上，`SHARED` + RPATH |

模板里的 `{{PROJECT_NAME}}` 必须替换；不要留下占位符。

## 反模式

- 全局 `include_directories(include)`：所有 target 共享，边界消失。
- `file(GLOB sources "src/*.cpp")`：新增文件不触发重新配置。
- 把库和 `main()` 编进同一个 target：测试无法只链接库。
- 在源码目录生成 `compile_commands.json` 或可执行文件。
- 同时设 `CMAKE_CXX_COMPILER` 和 `CXX` 环境变量，互相覆盖。
- 在 `CMakeLists.txt` 里 `execute_process` 下载依赖或改源码。
- 用 `CMAKE_CXX_FLAGS` 加 `-std=c++23` 之类与声明不符的标准。
