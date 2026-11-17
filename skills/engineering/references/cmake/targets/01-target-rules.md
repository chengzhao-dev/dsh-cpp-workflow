<!-- 读取时机：配 CMake 或工具链时；读完能回答：target、标准与产物目录怎么配；预算：一次只开这一份（234 行），不自动串联。 -->
# CMake

目标：一个编译器、Ninja、target-based 规则、可用的编译数据库。下面是最小形状和常见边界；工程模板仍由 `building-cpp` 提供，在 `../../../../building-cpp/assets/templates/projects/`，可复用的 CMake 函数在本技能的 `assets/`：`CompileSettings.cmake` 收标准与警告，`LinkSettings.cmake` 收构建期 RPATH 与 GoogleTest 依赖。

## 排版

CMake 没有单独的官方风格指南文档，官方仓库的 [.editorconfig](https://raw.githubusercontent.com/Kitware/CMake/master/.editorconfig) 规定 `CMakeLists.txt`、`*.cmake`、`*.rst` 使用 `indent_size = 2`、`indent_style = space`；本机 `cmake 4.2` 的 359 个官方模块没有一个文件含 tab。本仓与 C++ 源码统一为 4 个空格缩进，行内对齐也用空格；官方文档块内部仍按 RST 的 2 空格。行宽上限取 120 列，中文字符按 2 列计，既有 Tab 按 4 列展开后计宽；命令行、列表和注释一视同仁，官方文档块的分隔行固定 79 列，不跟着加宽。

注释用官方文档块。CMake 官方模块在文件开头放一个 `#[=======================================================================[.rst:` 块：模块名下一行画标题线，命令用 `.. command::`，签名用 `.. code-block:: cmake`，参数在正文里用双反引号包住（Kitware 的 [documentation.rst](https://github.com/Kitware/CMake/blob/master/Help/dev/documentation.rst) 与 [GoogleTest.cmake](https://github.com/Kitware/CMake/blob/master/Modules/GoogleTest.cmake) 都是这个形）。本仓照这个形写，块内散文用中文：模块名、`Commands`、`.. command::`、`.. code-block::` 这些标记保留英文，功能、边界与参数说明写中文句子。签名仍留在 `function()` 那一行，块里只抄调用形式，不重复参数表；CMake 函数没有返回值，不写 `:return:`，也不把 C++ 的 `@param`、`@return` 搬进来。模块文件不再画 `#---` 函数分隔线，一个文件的多个命令在 `Commands` 段落里逐个列出。`CMakeLists.txt` 以文件头开头：标题一行、`#` 一行、再用 1–2 行写用途，空一行后接命令；命令之间空一行，按“项目、模块、产物、子目录”的顺序自然分组，不画框线、不写段落标题；小文件可只留一行标题；工程模板提供最小形状，从 `cmake_minimum_required` 开始，注释保持最少，使用者按本段补齐；`CMakeLists.txt` 在每条命令上方写一句说明，子目录文件同样；同一文件保持同一句式，句子的主语按命令的实际对象（工程、目标、产物）写，不要每条都以「本工程」「本项目」开头。中文注释用全角标点，用书面语，避免口语词与网络用语；中文与英文、数字之间留一个空格，句子写完整并说明职责或原因，不复述命令名与模块名。模块文件（`*.cmake`）把说明写进 RST 文档块，函数体内不写行注释；子目录 `CMakeLists.txt` 用普通 `#` 注释。官方 [GoogleTest.cmake](https://github.com/Kitware/CMake/blob/master/Modules/GoogleTest.cmake) 在一个文件里放多个测试命令，可作“文件按职责聚合”的参照；社区 [CompilerWarnings.cmake](https://github.com/cpp-best-practices/cmake_template/blob/main/cmake/CompilerWarnings.cmake) 在每个警告 flag 后写它抓什么问题；本仓把这类说明收进文档块，函数体内不留行注释。

Shell 脚本同样用 4 个空格缩进；Google Shell Style Guide 用 2 个空格，本仓为单仓统一而有意偏离。

## 最小可用形状

### 单文件

```cmake
cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

# 先把 assets/ 里的 CompileSettings.cmake 复制到工程的 cmake/。
include(CompileSettings)

add_executable(app src/main.cpp)
set_target_cxx_standard(app PRIVATE c++23)
set_target_warnings(app PRIVATE LEVEL standard)
```

### 库 + 程序

```cmake
cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

# 先把 assets/ 里的 CompileSettings.cmake 复制到工程的 cmake/。
include(CompileSettings)

add_subdirectory(greeting)

add_executable(app src/main.cpp)
set_target_cxx_standard(app PRIVATE c++23)
set_target_warnings(app PRIVATE LEVEL standard)
target_link_libraries(app PRIVATE greeting)
```

```cmake
# greeting/CMakeLists.txt
add_library(greeting STATIC src/greeting.cpp)
target_include_directories(greeting PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
set_target_cxx_standard(greeting PUBLIC c++23)
set_target_warnings(greeting PRIVATE LEVEL standard)
```

- 库的 `PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include` 让程序与链接它的测试写 `#include "greeting.h"` 就能找到公共头，不需要各自再写 include 路径。
- 标准用 `set_target_cxx_standard`：库用 `PUBLIC` 传播“至少 C++NN”，程序用 `PRIVATE`；`CXX_STANDARD`/`CXX_EXTENSIONS` 是 target 属性，不是 INTERFACE 属性，不会跨 target 传播；每个会编译的 target 都要自己调用一次。
- `CXX_STANDARD_REQUIRED ON` 防止 CMake 在编译器不支持时静默降级；`CXX_EXTENSIONS OFF` 把 `-std=gnu++NN` 收成 `-std=c++NN`。configure 后检查 `compile_commands.json` 的最后一条 `-std=`。
- 程序 target 用项目技能点名的名字（模板默认 `app`，本书 `terminal`）；库 target 用组件名。

## 标准与复用

C++11–C++23 的两层声明、可见性、常见错误与验证见 `../standards/01-cxx-standard.md`。通用函数 `set_target_cxx_standard(target visibility c++NN)` 在 `../assets/CompileSettings.cmake`：

```cmake
set_target_cxx_standard(app PRIVATE c++23)
set_target_cxx_standard(greeting PUBLIC c++20)
```

函数名不绑定单一标准；新增档位只改函数里的支持列表。模块何时抽、文件怎么放、怎么导入与测试见 `../modules/01-functions.md`。

## 警告等级

`references/cmake/assets/CompileSettings.cmake` 的 `set_target_warnings(<target> <visibility> LEVEL basic|standard|strict)` 把常用 flag 收成三档；`visibility` 用 `PRIVATE` 或 `INTERFACE`，`PRIVATE` 不向使用方传播。警告与标准写在同一份编译设置模块里。

- `basic`：`-Wall -Wextra`；适合刚开始接 CI 的旧代码。
- `standard`：`basic` 加 `-Werror`、`-Wshadow`、`-Wold-style-cast`、`-Wpedantic`、`-Wnon-virtual-dtor`、`-Woverloaded-virtual`；默认档。
- `strict`：`standard` 加 `-Wconversion`、`-Wsign-conversion`、`-Wcast-align`、`-Wcast-qual`、`-Wformat=2`、`-Wundef`、`-Wdouble-promotion`、`-Wimplicit-fallthrough`、`-Wnull-dereference`；适合新代码或质量闸门。

MSVC 分支用 `/W4`、`/permissive-`、`/WX`；其他编译器直接报错，避免静默地没有警告。警告默认走 `PRIVATE`，库不把自己的策略强加给消费者；只有纯头文件库需要把同一档警告传给使用方时才用 `INTERFACE`。

## target-based 规则

- 每个 target 自己声明 include、标准、编译选项、链接库；不要用全局 `include_directories()`、`add_definitions()`、`CMAKE_CXX_FLAGS` 给所有 target 加料。
- `target_include_directories(<target> PUBLIC|PRIVATE <dir>)`：公共头给 `PUBLIC`，私有实现目录给 `PRIVATE`。
- `target_compile_features(<target> PUBLIC|PRIVATE cxx_std_NN)`：只传播“至少 C++NN”的最低要求；精确 `-std` 由 `set_target_cxx_standard` 在会编译的 target 上设置，不靠这一步锁死。
- `target_link_libraries(<target> PRIVATE|PUBLIC <lib>)`：实现依赖用 `PRIVATE`，接口依赖用 `PUBLIC`。官方文档只保证第一个参数已创建；当前 CMake 实现能解析稍后定义的库，但这不是文档承诺，拼错库名还会退化成 `-lname`。工程约定先定义库、再定义程序，不依赖隐式排序。
- 不要 `file(GLOB ...)`；显式列源文件，新增文件时改 CMake，构建系统才知道。`CONFIGURE_DEPENDS` 依赖构建系统每次检查目录，跨生成器行为也不完全一致，不作为工程规则。
- 不把 `main()` 编进库；程序只做装配和 I/O。
- 头文件不参与编译时，不需要 `target_sources` 列出；需要 IDE 展示时再列。
- 组件多起来时，一个组件一个 `CMakeLists.txt`：库放 `<component>/include` 与 `<component>/src`，程序放 `app/include` 与 `app/src`；`app/include` 只给程序内部用，不要被库 `PUBLIC` 导出。
- 源文件只列在它所在目录的 target 里；子目录的程序或测试用 `target_link_libraries` 链接该 target，不写 `../other/src/*.cpp`；跨目录共用代码时，先让源目录提供可链接的 target。
- CMake 注释只写 target 的职责、可见性和使用条件，不写「源码留在本目录」「子目录不写 ../other/src/*.cpp」这类目录边界；源文件列表与链接关系已经表达边界。
- 一个 target 的配置连续成块：按 `add_*`、`target_include_directories`、`set_target_cxx_standard`、`set_target_warnings`、其它 `target_*` 编译选项、`target_link_libraries`、`set_target_properties` 的顺序写；模板尚未引入设置函数时，`target_compile_features` 与设置 `CXX_STANDARD` 的 `set_target_properties` 占标准的位置，警告的 `target_compile_options` 占警告的位置。标准与警告必须相邻，`target_link_libraries` 与 `set_target_properties` 也必须相邻，中间不插其它调用。
- 测试 target 等出现第二个消费者时再加，不要为单个 `main()` 提前引入测试框架；测试只链接库的公共接口。

## 工程名

`project()` 的名字用 PascalCase，目录名用 kebab-case：

```cmake
project(TaskList VERSION 0.1.0 LANGUAGES CXX)
```

目录 `task-list/` 对应 `project(TaskList ...)`。派生规则是「按 `-` 切分、每段首字母大写、其余保留」，不要直接照抄目录名，也不要把 `{{PROJECT_NAME}}` 留在模板里。库 target 用组件名的小写形式（`task_list` 或 `tasks`），程序 target 由项目技能点名，模板默认 `app`。

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

- 可执行文件统一到 `build/<compiler>/bin`。
- 库统一到 `build/<compiler>/lib`。
- 不要输出到源码目录；`git status` 不应出现构建产物。
- 运行程序时从 `build/<compiler>/bin` 启动，或由脚本设置工作目录。

## 共享库运行时路径

```cmake
include(LinkSettings)
set_target_build_rpath(app)
```

- 函数按平台写 `BUILD_RPATH`：Linux 用 `$ORIGIN/../lib`，Apple 用 `@loader_path/../lib`。
- 只对需要直接运行构建产物的程序设置；安装规则另算。
- 不要用全局 `LD_LIBRARY_PATH` 包装所有命令；共享库的运行时路径由 target 的 RPATH 设置，不在脚本里全局改寻库路径。
- `$ORIGIN` 在 CMake 双引号里不是 `${...}`，不会被展开，保持字面量，不需要 `\$` 转义；`\$` 只在把字符串交给 shell 时使用。

## 标准库与编译器一致

- 一个构建树只用一个 C++ 标准库实现。Clang 可以配 libstdc++（Linux 默认）或 libc++，但 `clang++`、`clang-tidy`、`clangd` 和链接进同一个程序的库必须一致。
- `-stdlib=libc++` 是编译和链接都要的选项，不要只加在编译选项上；也不要全局 `add_compile_options`，按 target 传，或由工具链文件统一设置。
- 混用 libstdc++ 与 libc++ 的典型症状是链接期大量未定义符号、`std::string` ABI 不匹配，或运行期崩溃；先查 `clang++ -v` 与 `ldd`，不要靠加 `-lstdc++` 掩盖。
- 项目想固定 libc++ 时，在 CMake 工具链文件或项目自己的编译选项里写清，不要只写在某个人的脚本里；`environment.json` 只保留 `host`、`build_host`、`compiler`、`standard` 四个轴，不放 libc++。换机器后必须能复现同一组合。
- 本插件默认使用目标平台默认标准库；只有项目明确要求 libc++ 时才切换，并保证整套工具一致。

## 警告与静态检查

- 警告选项统一由 `set_target_warnings` 按 `basic` / `standard` / `strict` 施加，不要另写一套 `-Wall -Wextra -Werror` 列表；各档的具体 flag 见上文「警告等级」。
- 不要把警告选项加到全局 `CMAKE_CXX_FLAGS`；每个 target 显式加，或用一个函数统一施加。
- `clang-tidy` 在构建后单独跑，不挂进 CMake 的编译命令；这样编译数据库稳定，诊断可复现。
- 需要 `clang-tidy` 集成时用 `CMAKE_CXX_CLANG_TIDY`，但本项目默认不启用，避免构建与检查耦合。

## GoogleTest

需要测试框架时，用固定版本的 `fetch_googletest`：

```cmake
include(LinkSettings)
fetch_googletest()
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

## 正反例

### CMake 函数注释

**好**：

```cmake
#[=======================================================================[.rst:
CompileSettings
---------------

.. command:: set_target_cxx_standard

  .. code-block:: cmake

    set_target_cxx_standard(<target> <visibility> <standard>)

  让已存在的 ``<target>`` 使用 ``<standard>`` 指定的语言标准。
  本命令只改传入的目标，不设全局变量。
#]=======================================================================]
```

模块名、`Commands` 与 `.. code-block::` 这些标记保留英文，块内散文用中文；签名留在 `function()` 那一行，块里只抄调用形式。

**差**：

```cmake
# 给一个目标加上编译警告。
#
# :param target: 已经存在的 CMake 目标。
# :param visibility: 取 PRIVATE 或 INTERFACE。
# :keyword LEVEL: 可省略。取 basic、standard 或 strict。
function(set_target_warnings target visibility)
```

`:param`、`:keyword` 是 CMinx 的 Sphinx 字段，官方模块不用；`@param`、`@return` 是 C++ 的 Doxygen 标签，CMake 里也不用；CMake 函数没有返回值，不写 `:return:`。

## 依据

- [CMake: `add_library`](https://cmake.org/cmake/help/latest/command/add_library.html)：库 target 的类型与作用域。
- [CMake: `target_include_directories`](https://cmake.org/cmake/help/latest/command/target_include_directories.html)：`PUBLIC` / `PRIVATE` / `INTERFACE` 的传递。
- [CMake: `CMAKE_EXPORT_COMPILE_COMMANDS`](https://cmake.org/cmake/help/latest/variable/CMAKE_EXPORT_COMPILE_COMMANDS.html)：生成 `compile_commands.json`。
- [CMake: `CMAKE_CXX_STANDARD`](https://cmake.org/cmake/help/latest/variable/CMAKE_CXX_STANDARD.html)：标准版本与 `CXX_STANDARD_REQUIRED`。
- [CMake `documentation.rst`](https://github.com/Kitware/CMake/blob/master/Help/dev/documentation.rst)：官方文档块、`.. command::` 与参数段的写法。
- [CMake `.editorconfig`](https://raw.githubusercontent.com/Kitware/CMake/master/.editorconfig)：官方取 2 个空格、不用 tab；本仓改为 4 个空格，仍不用 tab。
