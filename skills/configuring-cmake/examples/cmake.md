# 正反例：CMake

## 最小可用形状

```cmake
cmake_minimum_required(VERSION 3.20)
project(greeter VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

# 先把 assets/cmake/ 里的 CompileSettings.cmake 复制到工程的 cmake/。
include(CompileSettings)

add_library(greeting STATIC greeting/src/greeting.cpp)
target_include_directories(greeting PUBLIC greeting/include)
CompileSettings_SetCxxStandard(greeting PUBLIC c++23)
CompileSettings_SetWarnings(greeting PRIVATE LEVEL standard)

add_executable(app src/main.cpp)
CompileSettings_SetCxxStandard(app PRIVATE c++23)
CompileSettings_SetWarnings(app PRIVATE LEVEL standard)
target_link_libraries(app PRIVATE greeting)
```

程序只写 `#include "greeting.h"`；公共 include 根由库的 `PUBLIC` 传过来。

## 全局 include

**差**：

```cmake
include_directories(include greeting/include)
add_executable(app src/main.cpp greeting/src/greeting.cpp)
```

问题：所有 target 共享 include，边界消失；程序直接编译库源码，测试无法只链接库。

**好**：

```cmake
target_include_directories(greeting PUBLIC greeting/include)
target_link_libraries(app PRIVATE greeting)
```

## GLOB

**差**：

```cmake
file(GLOB SOURCES "src/*.cpp")
add_executable(app ${SOURCES})
```

新增文件不触发重新配置；不同机器上的文件集合可能不同。

**好**：

```cmake
add_executable(app
  src/main.cpp
  src/task_list.cpp
  src/task_parser.cpp
)
```

显式列表，新增文件时改 CMake；diff 能看出变化。

## 把 `main()` 编进库

**差**：

```cmake
add_library(core STATIC src/main.cpp src/core.cpp)
add_executable(app src/main.cpp)   # 重复定义
```

**好**：

```cmake
add_library(core STATIC src/core.cpp)
add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE core)
```

库不依赖 `main()`；测试链接库时不会碰到入口。

## 标准只写一半

**差**：

```cmake
target_compile_features(app PRIVATE cxx_std_20)
# 没写 CXX_STANDARD_REQUIRED；编译器不支持时可能静默降级
set_target_properties(app PROPERTIES CXX_STANDARD 20)
```

问题：meta-feature 只保证“至少”，`CXX_STANDARD` 又允许 decay，实际标准可能不是 20。

**好**：

```cmake
CompileSettings_SetCxxStandard(app PRIVATE c++20)
```

两套声明同时写；`CXX_STANDARD_REQUIRED ON` 禁止降级，`CXX_EXTENSIONS OFF` 把 `gnu++20` 收成 `c++20`。

## 警告等级

**差**：

```cmake
target_compile_options(app PRIVATE -Wall -Wextra -Werror)
target_compile_options(core PRIVATE -Wall -Wextra -Werror)
# 每个 target 复制一遍；想加 -Wshadow 时要逐处改
```

**好**：

```cmake
CompileSettings_SetWarnings(app PRIVATE LEVEL standard)
CompileSettings_SetWarnings(core PRIVATE LEVEL strict)
```

`basic` 只开 `-Wall -Wextra`；`standard` 加 `-Werror`、`-Wshadow`、`-Wold-style-cast`、`-Wpedantic`、`-Wnon-virtual-dtor`、`-Woverloaded-virtual`；`strict` 再加转换、格式化与可移植性告警。警告只作用于传入 target，不通过 `INTERFACE` 传播。

## 编译数据库

**差**：

```cmake
# 没开导出
```

```bash
clang-tidy src/main.cpp   # 没有编译参数，头路径和标准都不对
```

**好**：

```cmake
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
```

```bash
cmake -S . -B build/clang -G Ninja -DCMAKE_CXX_COMPILER=clang++
rm -f build/compile_commands.json
ln -s clang/compile_commands.json build/compile_commands.json
clang-tidy -p build/clang src/main.cpp
```

## 共享库运行时路径

**差**：

```bash
LD_LIBRARY_PATH=build/clang/lib ./build/clang/bin/app   # 每次运行都要包一层
```

**好**：

```cmake
# LinkSettings.cmake 提供 RPATH 与 GoogleTest 依赖函数。
include(LinkSettings)

add_library(greeting SHARED greeting/src/greeting.cpp)
set_target_properties(greeting PROPERTIES
  LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE greeting)
LinkSettings_SetBuildRpath(app)
```

从 `build/<compiler>/bin/app` 直接启动即可找到同级 `../lib` 下的共享库；安装场景另配 RPATH。

## 输出目录

**差**：可执行文件生成在源码根，`git status` 出现 `app`、`*.o`。

**好**：

```cmake
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
```

构建产物全在 `build/<compiler>/` 下。

## 注释

**差**：

```cmake
#[[.rst:
CompileSettings_SetWarnings
---------------------------

.. command:: CompileSettings_SetWarnings(target visibility)

:param target: 目标。
@param visibility: 可见性。
@return: 无。
]]
```

`#[[.rst:` 与 `.. command::` 是给要进 CMake 手册的模块用的抽取标记，本仓模块不进手册；`@param`、`@return` 是 C++ 的 Doxygen 标签，CMake 里不用。CMake 函数也没有返回值，`:return:` 同样不写。

**好**：

```cmake
# 给一个目标加上编译警告。
#
# 只改传入的目标。PRIVATE 不向使用方传播。
#
# :param target: 已经存在的 CMake 目标。
# :param visibility: 取 PRIVATE 或 INTERFACE。
# :keyword LEVEL: 可省略。取 basic、standard 或 strict；省略时按 standard。
function(CompileSettings_SetWarnings target visibility)
```

普通 `#` 行，签名留在 `function()` 那一行；位置参数用 `:param`，`cmake_parse_arguments` 的关键字用 `:keyword`。
