# 第 3 步：通过检查

## 产出

一次干净的 configure、一次构建、一份与 `environment.json` 一致的编译数据库。检查只回答「target 契约是否成立」，完整的 CTest 与运行由 `building-cpp` 的通过检查接手。

## 命令

configure 与构建的完整命令（Ninja、编译器、`CMAKE_EXPORT_COMPILE_COMMANDS` 与编译数据库链接）以 `building-cpp` 的 `steps/01-build.md`「命令」为唯一出处，本步不重复；GCC 模式也按那一处换目录与编译器。每次检查都重新 configure，不依赖上一次缓存；同一构建目录只放同一编译器的配置。

## 核对项

下文 `<构建目录>` 取项目技能声明的单一构建目录（如 `games/<game>/build`），没声明时用 `build/<compiler>`；`<程序 target>` 取项目技能「程序 target」字段，模板默认 `app`。

- **target 图**：`<程序 target>` 链接库，库的公共 include 用 `PUBLIC`；没有把 `main()` 编进库。
- **标准**：读 `<构建目录>/compile_commands.json` 中每个 target 的 `-std=`；每个 target 只能有一条，必须与 `environment.json` 的 `standard` 一致，不能是 `gnu++NN` 或更高默认标准，不同值即失败。
- **没有全局污染**：全仓搜索 `include_directories`、`add_definitions`、`CMAKE_CXX_FLAGS`、`file(GLOB`，命中就回第 1 步。
- **模块导入**：根 `CMakeLists.txt` 只导入一次；函数名与文件名可追溯；删除旧模块后没有残留 `include()`。
- **排版**：`CMakeLists.txt` 与 `*.cmake` 缩进用 4 个空格，行内对齐也用空格，UTF-8 无 BOM、LF；抽查 120 列（中文按 2 列计）以上的行是否有必要。
- **文档块**：每个模块文件开头有 `#[=` 文档块与 `.. command::`，块内散文写中文，签名留在 `function()` 那一行。
- **产物位置**：可执行文件在 `<构建目录>/bin`，库在 `<构建目录>/lib`；源码目录没有新增构建产物。
- **产物可加载**：对 `<构建目录>/bin/<程序 target>` 跑 `file` 与 `ldd`（macOS 用 `otool -L`），不得出现 `not found`；出现缺失按 RPATH 回第 1 步。启动检查由 `building-cpp` 的入口命令负责。见 `../references/cmake/linking/04-inspect.md`。

## 失败分流

| 现象 | 回哪一步 |
| --- | --- |
| 找不到 target、链接失败、include 路径不对 | 第 1 步 |
| 目标标准没有生效、`-std` 与声明不一致 | 第 1 步，必要时重读 `../references/cmake/standards/01-cxx-standard.md` |
| 函数参数没校验、模块重复导入、旧模块残留 | 第 2 步 |
| 只是 CTest 或运行失败 | 转 `building-cpp` 的通过检查 |

## 交回构建

本步的判据是 configure 与构建成功、数据库标准正确、结构规则无命中；工具链、入口脚本、`clang-tidy` 与 CTest 的完整检查见 `building-cpp` 的 `../../building-cpp/steps/03-check.md`。
