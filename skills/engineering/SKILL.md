---
name: engineering
description: 编写或重构 C++11–C++23 工程的 CMake 与排版工具配置时使用：CMakeLists.txt、cmake 模块、target 属性、依赖与输出目录、语言标准，以及 clang-format、clang-tidy、clangd；新工程默认 C++23。不用于 Quarto、Python 或非 C++ 文档。
metadata:
  short-description: CMake 与排版工具
---

# engineering

## 适用场景

本技能管两件事：CMake 文件与 target 契约（`CMakeLists.txt`、`cmake/` 模块、`target_*` 命令、目标属性、include 与链接边界、输出目录、共享库运行时路径、`FetchContent`、preset 与安装导出），以及编码与排版工具配置（UTF-8/LF、clang-format、clang-tidy、clangd）。函数体、类型、命名、异常和源码注释只开 `developing-cpp`；构建目录、编译器、入口脚本与运行检查开 `building-cpp`。

一次改动同时碰到源码和 CMake 时先开 `developing-cpp` 定行为与边界，再用本技能把源文件、库和程序写进 target，最后到 `building-cpp` 跑检查。只改一个 target 的 include、链接或标准时走单点修正；新工程、新组件、换语言标准或抽公共函数时走整段重构。

存在项目技能 `cpp-workflow-project` 时先读它的 `SKILL.md`、`environment.json` 和 `stages/stage-table.md`。`environment.json` 的 `standard` 是 target 标准的唯一来源；缺失、非法或与现有 target 不一致时停在定 target，不猜标准。构建目录、编译器和工具版本由 `building-cpp` 的定构建负责，本技能只写 target 契约与工具配置；target 图与 CMake 写法以本技能为权威，`building-cpp` 只读不修改。

## 三种操作

一次只选一种，范围（单点、整段）是任务属性。操作与域的判据、边界和交接见 `../developing-cpp/source/01-editing/01-edit-operations.md`；四类改动是域，不是操作。

| 操作 | 什么时候用 | 从哪步进 |
| --- | --- | --- |
| 写作（起稿） | 新增 target、改公共 include 或链接边界、换语言标准 | 第 1 步；新工程走到第 3 步 |
| 改写 | target 图与标准不变，模块、函数或目录结构不对 | 从第 2 步重走，可到第 3 步 |
| 润色 | 只改函数名、注释措辞或错误消息 | 第 2 步 |

三种操作共用这些约束：不发明项目没有声明的 target、标准、编译器或目录；不覆盖已有 `CMakeLists.txt`；不用全局 `include_directories()`、`add_definitions()`、`CMAKE_CXX_FLAGS` 给所有 target 加料；不写 `file(GLOB ...)`；不把 `main()` 编进库；库与程序不下载依赖，只有测试需要时调用 `LinkSettings_FetchGoogleTest`。后一步发现前一步没做完，退回那一步。排版工具配置只改本技能点名的三份文件，不顺手改项目其他文件。

## 步骤

| 步 | 名称 | 文件 | 一句话 |
| --- | --- | --- | --- |
| 1 | 定 target 与标准 | `cmake/steps/01-targets.md` | target 图、PUBLIC/PRIVATE、标准、输出目录与编译数据库 |
| 2 | 定模块与函数 | `cmake/steps/02-modules.md` | 何时抽函数、文件与命名、导入、注释与 2 空格排版 |
| 3 | 通过检查 | `cmake/steps/03-check.md` | configure、构建、编译数据库与实际 `-std` 核对 |

每步只打开同号的一个步骤文件。步骤只覆盖 CMake；编码与 clang 工具没有步骤，按下面的入口表直接打开那一份文件。

### 入口表

| 要做的事 | 打开 |
| --- | --- |
| 定 target、include、链接、输出目录与警告 | `cmake/01-targets/01-rules.md`；案例在 `cmake/01-targets/examples/` |
| 定语言标准与档位 | `cmake/03-standard/01-cxx-standard.md`；五档细节在 `cmake/03-standard/standards/` |
| 抽 CMake 函数与模块 | `cmake/02-modules/01-functions.md` |
| 链接方式、rpath、undefined reference、产物核对 | 按问题只开一份：`cmake/linking/01-libraries.md`、`02-rpath.md`、`03-undefined-reference.md`、`04-inspect.md` |
| CTest 注册、断言与用例拆分 | `cmake/testing/ctest.md` |
| 编码、BOM 与行尾 | `formatting/01-encoding.md` |
| clang-format | `formatting/02-clang-format.md`；案例 `formatting/examples/clang-format.md` |
| clang-tidy 与检查分级 | `formatting/03-clang-tidy.md`；案例 `formatting/examples/clang-tidy.md` |
| clangd 与编辑器补全 | `formatting/04-clangd.md`；案例 `formatting/examples/clangd.md` |
| 可复制的 CMake 函数 | `cmake/assets/CompileSettings.cmake`、`cmake/assets/LinkSettings.cmake` |

本轮激活按三条上限走：

- 只开当前步对应的一个步骤文件；同一改动域内不同时展开两个技能的步骤。跨域按 `源码 → engineering → building-cpp` 的顺序逐段进入，前一段结论落下再开下一段。
- 条文只开该步点名的一份；同号案例留到下一次激活。排版工具一次只开入口表里的那一份。
- 标准档只打开项目技能声明的那一档，没有声明时用本技能已有的新工程默认，不把其余标准档读进来。

项目技能列出了检查命令时只跑那一条，没有时跑插件根目录的 `npm test`；退出码为 0 后在同一轮结束 goal，不再继续走没有失败的步骤。

五档标准的语言设施、工具映射与降档由 `cmake/03-standard/standards/` 维护；本技能只负责这些标准在 CMake 里怎么写，以及三份工具配置各自的最低版本。

### 四类改动

四类改动是操作内部的域：操作定入口，域定层次。四域的定义、边界与次序见 `../developing-cpp/source/01-editing/01-edit-operations.md`；一次改动混了两类时，按「内容 → 结构 → 版式 → 措辞」拆开做，前一类落定并经检查再进下一类。

| 类型 | 典型请求 | 入口步骤 |
| --- | --- | --- |
| 内容 | 新增 target、改公共 include 或链接边界、换语言标准 | `cmake/steps/01-targets.md` |
| 结构 | 抽函数、拆模块、调导入位置 | `cmake/steps/02-modules.md` |
| 版式 | 只改 2 空格、行宽、注释形态或工具配置 | `cmake/steps/02-modules.md`；工具配置见 `formatting/02-clang-format.md` |
| 措辞 | 只改函数名、注释措辞或错误消息 | `cmake/steps/02-modules.md` |

## 完成判据

- [ ] target 图显式：程序 target 叫 `app`，库 target 用组件名，程序链接库，库的公共 include 用 `PUBLIC`；没有全局 include、全局编译选项或 GLOB。
- [ ] 每个 target 的标准来自 `environment.json`；`target_compile_features` 与 `CXX_STANDARD`、`CXX_STANDARD_REQUIRED ON`、`CXX_EXTENSIONS OFF` 同时存在，live 的 `compile_commands.json` 最后一条 `-std=` 与声明一致，不是 `gnu++NN`。
- [ ] 复用的 CMake 函数放在 `cmake/` 模块里，文件名用 UpperCamelCase，函数名用 `<ModuleName>_` 加 PascalCase，有目标与参数校验，根 `CMakeLists.txt` 通过 `CMAKE_MODULE_PATH` 导入；没有重复片段和未使用的旧模块。
- [ ] 公开函数上方写中文 `#` 契约：一句功能、空行、边界，再用 `:param` / `:keyword` 标参数；不写 `#[[.rst:` 与 `.. command::`，完整写法见 `cmake/01-targets/01-rules.md`；函数组之间用 `#---`，不画 `#===...===#` 方框。
- [ ] `CMakeLists.txt` 与 `*.cmake` 用 UTF-8 无 BOM、LF、2 空格缩进、不用 tab；行宽按团队约定，默认 80 列。
- [ ] 编码与排版工具各管一段：`.clang-format` 管空白与包含顺序，`.clang-tidy` 管检查分级，`.clangd` 管编辑器补全；三份都不把标准写死成与 `environment.json` 冲突的值，也不把 clang-format 塞进构建脚本。
- [ ] configure 与构建通过，构建产物不落在源码目录；没有改源码语义，也没有覆盖已有工程文件。
