# CMake

目标：一个编译器、Ninja、target-based 规则、可用的编译数据库。下面是最小形状和常见边界；工程模板仍由 `building-cpp` 提供，在 `../../building-cpp/assets/templates/projects/`，可复用的 CMake 函数在本技能的 `assets/cmake/`：`CompileSettings.cmake` 收标准与警告，`LinkSettings.cmake` 收构建期 RPATH 与 GoogleTest 依赖。

## 排版

CMake 没有单独的官方风格指南文档，但官方仓库的 [.editorconfig](https://raw.githubusercontent.com/Kitware/CMake/master/.editorconfig) 明确规定：`CMakeLists.txt`、`*.cmake`、`*.rst` 使用 `indent_size = 2`、`indent_style = space`。这是官方代码风格的直接依据。行宽 80 列来自社区 `cmake-format` 约定（[or-tools](https://github.com/google/or-tools/blob/stable/.cmake-format.py)、[draco](https://github.com/google/draco/blob/master/.cmake-format.py) 都设 `tab_size=2`、`line_width=80`），不是 CMake 官方强制值。命令行、列表和注释都按项目约定的宽度换行；`CMakeLists.txt` 与 `*.cmake` 一视同仁。

注释不用 `#[[.rst:`。那层标记只属于要进 CMake 手册的模块：Kitware 在 [documentation.rst](https://github.com/Kitware/CMake/blob/master/Help/dev/documentation.rst) 里用 `.. command::` 与参数段，供 Sphinx 从源码抽进手册；本仓的模块不进手册，读者也读不懂这层标记。公开函数上方写中文 `#` 契约：第一句说功能，空一行写边界，再用 `:param 名字:` 标位置参数、`:keyword 名字:` 标 `cmake_parse_arguments` 的关键字；CMake 函数没有返回值，不写 `:return:`，也不把 C++ 的 `@param`、`@return` 搬进来。字段取自 [CMinx](https://cmakepp.github.io/CMinx/documenting/function.html)；本仓不跑 CMinx，注释保持普通 `#` 行。签名留在 `function()` 那一行，同一文件的函数组之间用一条 `#---` 短横线分隔；行注释只写原因，不画 `#===...===#` 方框。官方 [GoogleTest.cmake](https://github.com/Kitware/CMake/blob/master/Modules/GoogleTest.cmake) 在一个文件里放多个测试函数，可作“文件按职责聚合”的参照；社区 [CompilerWarnings.cmake](https://github.com/cpp-best-practices/cmake_template/blob/main/cmake/CompilerWarnings.cmake) 在每个警告 flag 后写它抓什么问题，可作参数注释的参照。

Shell 脚本用 2 个空格缩进、不用 tab，来源是 [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html#indentation)。

## 最小可用形状

### 单文件

```cmake
cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

# 先把 assets/cmake/ 里的 CompileSettings.cmake 复制到工程的 cmake/。
include(CompileSettings)

add_executable(app src/main.cpp)
CompileSettings_SetCxxStandard(app PRIVATE c++23)
CompileSettings_SetWarnings(app PRIVATE LEVEL standard)
```

### 库 + 程序

```cmake
cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

# 先把 assets/cmake/ 里的 CompileSettings.cmake 复制到工程的 cmake/。
include(CompileSettings)

add_subdirectory(greeting)

add_executable(app src/main.cpp)
CompileSettings_SetCxxStandard(app PRIVATE c++23)
CompileSettings_SetWarnings(app PRIVATE LEVEL standard)
target_link_libraries(app PRIVATE greeting)
```

```cmake
# greeting/CMakeLists.txt
add_library(greeting STATIC src/greeting.cpp)
target_include_directories(greeting PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
CompileSettings_SetCxxStandard(greeting PUBLIC c++23)
CompileSettings_SetWarnings(greeting PRIVATE LEVEL standard)
```

- 库的 `PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include` 让程序与链接它的测试写 `#include "greeting.h"` 就能找到公共头，不需要各自再写 include 路径。
- 标准用 `CompileSettings_SetCxxStandard`：库用 `PUBLIC` 传播，程序用 `PRIVATE`；函数内部同时写 `target_compile_features` 与 `CXX_STANDARD` 三属性。
- `CXX_STANDARD_REQUIRED ON` 防止 CMake 在编译器不支持时静默 decay；`CXX_EXTENSIONS OFF` 把 `-std=gnu++NN` 收成 `-std=c++NN`。configure 后检查 `compile_commands.json` 的最后一条 `-std=`。
- 程序 target 固定 `app`；库 target 用组件名。

## 标准与复用

C++11–C++23 的两层声明、可见性、常见错误与验证见 `references/cxx-standard.md`。通用函数 `CompileSettings_SetCxxStandard(target visibility c++NN)` 在 `assets/cmake/CompileSettings.cmake`：

```cmake
CompileSettings_SetCxxStandard(app PRIVATE c++23)
CompileSettings_SetCxxStandard(greeting PUBLIC c++20)
```

函数名不绑定单一标准；新增档位只改函数里的支持列表。模块何时抽、文件怎么放、怎么导入与测试见 `references/modules.md`。

## 警告等级

`cmake/CompileSettings.cmake` 的 `CompileSettings_SetWarnings(<target> <visibility> LEVEL basic|standard|strict)` 把常用 flag 收成三档；`visibility` 用 `PRIVATE` 或 `INTERFACE`，`PRIVATE` 不向使用方传播。警告与标准写在同一份编译设置模块里。

- `basic`：`-Wall -Wextra`；适合刚开始接 CI 的旧代码。
- `standard`：`basic` 加 `-Werror`、`-Wshadow`、`-Wold-style-cast`、`-Wpedantic`、`-Wnon-virtual-dtor`、`-Woverloaded-virtual`；默认档。
- `strict`：`standard` 加 `-Wconversion`、`-Wsign-conversion`、`-Wcast-align`、`-Wcast-qual`、`-Wformat=2`、`-Wundef`、`-Wdouble-promotion`、`-Wimplicit-fallthrough`、`-Wnull-dereference`；适合新代码或质量闸门。

MSVC 分支用 `/W4`、`/permissive-`、`/WX`；其他编译器直接报错，避免静默地没有警告。警告是 target 的 `PRIVATE` 选项，库不把自己的策略强加给消费者。

## target-based 规则

- 每个 target 自己声明 include、标准、编译选项、链接库；不要用全局 `include_directories()`、`add_definitions()`、`CMAKE_CXX_FLAGS` 给所有 target 加料。
- `target_include_directories(<target> PUBLIC|PRIVATE <dir>)`：公共头给 `PUBLIC`，私有实现目录给 `PRIVATE`。
- `target_compile_features(<target> PUBLIC cxx_std_NN)`：标准是 target 属性，不是全局开关；优先调用项目 `cmake/` 里的标准函数。
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
include(LinkSettings)
LinkSettings_SetBuildRpath(app)
```

- 函数按平台写 `BUILD_RPATH`：Linux 用 `$ORIGIN/../lib`，Apple 用 `@loader_path/../lib`。
- 只对需要直接运行构建产物的程序设置；安装规则另算。
- 不要用全局 `LD_LIBRARY_PATH` 包装所有命令；共享库的运行时路径由 target 的 RPATH 设置，不在脚本里全局改寻库路径。
- `$ORIGIN` 在 CMake 双引号里不是 `${...}`，不会被展开，保持字面量；若遇到展开问题，用 `"\$ORIGIN/../lib"`。

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

需要测试框架时，用固定版本的 `LinkSettings_FetchGoogleTest`：

```cmake
include(LinkSettings)
LinkSettings_FetchGoogleTest()
```

- 函数内部固定 GoogleTest v1.17.0 的 URL 与 SHA-256，避免供应链漂移；版本升级只改一处。
- 只在 `tests/` 需要时调用；库和程序不依赖测试框架。
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
