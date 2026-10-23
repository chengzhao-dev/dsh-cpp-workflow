# CMake

目标：一个编译器、Ninja、target-based 规则、可用的编译数据库。下面是最小形状和常见边界；模板在 `assets/templates/projects/`。

## 排版

CMake 没有官方风格指南。这里跟随 Google 自家项目的 `cmake-format` 配置：缩进 2 个空格、行宽 80、不用 tab。来源是 [or-tools 的 .cmake-format.py](https://github.com/google/or-tools/blob/stable/.cmake-format.py) 与 [draco 的 .cmake-format.py](https://github.com/google/draco/blob/master/.cmake-format.py)，两处都设 `tab_size=2`、`line_width=80`。命令行、列表和注释都按这个宽度换行；`CMakeLists.txt` 与 `*.cmake` 一视同仁。

Shell 脚本用 2 个空格缩进、不用 tab，来源是 [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html#indentation)。

## 最小可用形状

### 单文件

```cmake
cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

add_executable(app src/main.cc)
target_compile_features(app PRIVATE cxx_std_23)
set_target_properties(app PROPERTIES
  CXX_STANDARD 23
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
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

add_executable(app src/main.cc)
target_compile_features(app PRIVATE cxx_std_23)
set_target_properties(app PROPERTIES
  CXX_STANDARD 23
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
target_link_libraries(app PRIVATE greeting)
target_compile_options(app PRIVATE -Wall -Wextra -Werror)
```

```cmake
# greeting/CMakeLists.txt
add_library(greeting STATIC src/greeting.cc)
target_include_directories(greeting PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/..)
target_compile_features(greeting PUBLIC cxx_std_23)
set_target_properties(greeting PROPERTIES
  CXX_STANDARD 23
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
target_compile_options(greeting PRIVATE -Wall -Wextra -Werror -Wold-style-cast -Wshadow)
```

- 库的 `PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/..` 让程序能从仓库根写 `#include "greeting/include/greeting.h"`，不需要程序再写 include 路径。
- `cxx_std_23` 用 `PUBLIC` 从库传播；程序自己再加一次也无害。`CXX_STANDARD_REQUIRED ON` 防止 CMake 在编译器不支持时静默 decay；显式 `CXX_STANDARD` 与 `standard` 保持一致。
- `CXX_EXTENSIONS OFF` 把 `-std=gnu++23` 收成 `-std=c++23`，与 Google 的「不用非标准扩展」一致；每个 target 都要设。configure 后检查 `compile_commands.json` 的最后一条 `-std=`，不能是 `gnu++NN`。
- 程序 target 固定 `app`；库 target 用组件名。

## target-based 规则

- 每个 target 自己声明 include、标准、编译选项、链接库；不要用全局 `include_directories()`、`add_definitions()`、`CMAKE_CXX_FLAGS` 给所有 target 加料。
- `target_include_directories(<target> PUBLIC|PRIVATE <dir>)`：公共头给 `PUBLIC`，私有实现目录给 `PRIVATE`。
- `target_compile_features(<target> PUBLIC cxx_std_23)`：标准是 target 属性，不是全局开关。
- `target_link_libraries(<target> PRIVATE|PUBLIC <lib>)`：实现依赖用 `PRIVATE`，接口依赖用 `PUBLIC`。
- 不要 `file(GLOB ...)`；显式列源文件，新增文件时改 CMake，构建系统才知道。`CONFIGURE_DEPENDS` 依赖构建系统每次检查目录，跨生成器行为也不完全一致，不作为工程规则。
- 不把 `main()` 编进库；程序只做装配和 I/O。
- 头文件不参与编译时，不需要 `target_sources` 列出；需要 IDE 展示时再列。
- 组件多起来时，一个组件一个 `CMakeLists.txt`：库放 `<component>/include` 与 `<component>/src`，程序放 `apps/include` 与 `apps/src`；`apps/include` 只给程序内部用，不要被库 `PUBLIC` 导出。
- 测试 target 等出现第二个消费者时再加，不要为单个 `main()` 提前引入测试框架；测试只链接库的公共接口。

## 工程名

`project()` 的名字用 PascalCase，目录名用 kebab-case：

```cmake
project(TaskList VERSION 0.1.0 LANGUAGES CXX)
```

目录 `task-list/` 对应 `project(TaskList ...)`。派生规则是「按 `-` 切分、每段首字母大写、其余保留」，不要直接照抄目录名，也不要把 `{{PROJECT_NAME}}` 留在模板里。库 target 用组件名的小写形式（`task_list` 或 `tasks`），程序 target 固定 `app`。

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
- 不要用全局 `LD_LIBRARY_PATH` 包装所有命令；共享库的运行时路径由 target 的 RPATH 设置，不在脚本里全局改寻库路径。
- `$ORIGIN` 在 CMake 字符串里要转义成 `\$ORIGIN` 吗？在双引号里 `$ORIGIN` 会被 CMake 当变量；写成 `"$ORIGIN/../lib"` 在 CMake 中 `$ORIGIN` 不是 `${...}`，不会被展开，保持字面量。若遇到展开问题，用 `"\$ORIGIN/../lib"`。

## 标准库与编译器一致

- 一个构建树只用一个 C++ 标准库实现。Clang 可以配 libstdc++（Linux 默认）或 libc++，但 `clang++`、`clang-tidy`、`clangd` 和链接进同一个程序的库必须一致。
- `-stdlib=libc++` 是编译和链接都要的选项，不要只加在编译选项上；也不要全局 `add_compile_options`，按 target 传，或由工具链文件统一设置。
- 混用 libstdc++ 与 libc++ 的典型症状是链接期大量未定义符号、`std::string` ABI 不匹配，或运行期崩溃；先查 `clang++ -v` 与 `ldd`，不要靠加 `-lstdc++` 掩盖。
- 项目想固定 libc++ 时，在 CMake 工具链文件或项目自己的编译选项里写清，不要只写在某个人的脚本里；`environment.json` 只保留 `host`、`build_host`、`compiler`、`standard` 四个轴，不放 libc++。换机器后必须能复现同一组合。
- 本插件默认使用目标平台默认标准库；只有项目明确要求 libc++ 时才切换，并保证整套工具一致。

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
  URL https://codeload.github.com/google/googletest/tar.gz/refs/tags/v1.17.0
  URL_HASH SHA256=65fab701d9829d38cb77c14acdc431d2108bfdbf8979e40eb8ae567edf10b27c
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
| `single` | 一个 `main.cc`，辅助函数很少 | `CMakeLists.txt`, `src/main.cc` |
| `multi` | 多个源文件，一个程序 | `CMakeLists.txt`, `include/`, `src/` |
| `static-library` | 库需要被测试或第二个程序链接 | 根 + `greeting/` 子目录 |
| `shared-library` | 需要运行时加载/替换 | 同上，`SHARED` + RPATH |

模板里的 `{{PROJECT_NAME}}` 必须替换；不要留下占位符。

## 反模式

- 全局 `include_directories(include)`：所有 target 共享，边界消失。
- `file(GLOB sources "src/*.cc")`：新增文件不触发重新配置。
- 把库和 `main()` 编进同一个 target：测试无法只链接库。
- 在源码目录生成 `compile_commands.json` 或可执行文件。
- 同时设 `CMAKE_CXX_COMPILER` 和 `CXX` 环境变量，互相覆盖。
- 在 `CMakeLists.txt` 里 `execute_process` 下载依赖或改源码。
- 用 `CMAKE_CXX_FLAGS` 加 `-std=c++23` 之类与声明不符的标准。
