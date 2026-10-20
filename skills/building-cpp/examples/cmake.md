# 正反例：CMake

## 最小可用形状

```cmake
cmake_minimum_required(VERSION 3.20)
project(greeter VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

add_library(greeting STATIC greeting/src/greeting.cpp)
target_include_directories(greeting PUBLIC greeting/include)
target_compile_features(greeting PUBLIC cxx_std_20)
set_target_properties(greeting PROPERTIES CXX_EXTENSIONS OFF)
target_compile_options(greeting PRIVATE -Wall -Wextra -Werror)

add_executable(app src/main.cpp)
target_compile_features(app PRIVATE cxx_std_20)
set_target_properties(app PROPERTIES CXX_EXTENSIONS OFF)
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
LD_LIBRARY_PATH=build/lib ./build/bin/app   # 每次运行都要包一层
```

**好**：

```cmake
add_library(greeting SHARED greeting/src/greeting.cpp)
set_target_properties(greeting PROPERTIES
  LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE greeting)
if(APPLE)
  set_target_properties(app PROPERTIES BUILD_RPATH "@loader_path/../lib")
else()
  set_target_properties(app PROPERTIES BUILD_RPATH "$ORIGIN/../lib")
endif()
```

从 `build/bin/app` 直接启动即可找到 `../lib` 下的共享库；安装场景另配 RPATH。

## 输出目录

**差**：可执行文件生成在源码根，`git status` 出现 `app`、`*.o`。

**好**：

```cmake
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
```

构建产物全在 `build/<compiler>/` 下。
