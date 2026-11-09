# 第 3 步：通过检查

## 产出

一次干净的 configure、一次构建、一份与 `environment.json` 一致的编译数据库。检查只回答「target 契约是否成立」，完整的 CTest 与运行由 `building-cpp` 的通过检查接手。

## 命令

```bash
cmake -S . -B build/clang -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_C_COMPILER=clang \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build/clang
```

GCC 模式把目录和编译器换成 `build/gcc`、`g++`。每次检查都重新 configure，不依赖上一次缓存；同一构建目录只放同一编译器的配置。

## 核对项

- **target 图**：`app` 链接库，库的公共 include 用 `PUBLIC`；没有把 `main()` 编进库。
- **标准**：读 `build/clang/compile_commands.json` 中每个 target 的 `-std=`；每个 target 只能有一条，必须与 `environment.json` 的 `standard` 一致，不能是 `gnu++NN` 或更高默认标准，不同值即失败。
- **没有全局污染**：全仓搜索 `include_directories`、`add_definitions`、`CMAKE_CXX_FLAGS`、`file(GLOB`，命中就回第 1 步。
- **模块导入**：根 `CMakeLists.txt` 只导入一次；函数名与文件名可追溯；删除旧模块后没有残留 `include()`。
- **排版**：`CMakeLists.txt` 与 `*.cmake` 无 tab、2 空格缩进、UTF-8 无 BOM、LF；抽查 80 列以上的行是否有必要。
- **产物位置**：可执行文件在 `build/<compiler>/bin`，库在 `build/<compiler>/lib`；源码目录没有新增构建产物。
- **产物可加载**：对 `build/<compiler>/bin/app` 跑 `file` 与 `ldd`（macOS 用 `otool -L`），不得出现 `not found`；出现缺失按 RPATH 回第 1 步。启动检查由 `building-cpp` 的入口命令负责。见 `../references/cmake/linking/04-inspect.md`。

## 失败分流

| 现象 | 回哪一步 |
| --- | --- |
| 找不到 target、链接失败、include 路径不对 | 第 1 步 |
| 目标标准没有生效、`-std` 与声明不一致 | 第 1 步，必要时重读 `../references/cmake/standards/01-cxx-standard.md` |
| 函数参数没校验、模块重复导入、旧模块残留 | 第 2 步 |
| 只是 CTest 或运行失败 | 转 `building-cpp` 的通过检查 |

## 交回构建

本步的判据是 configure 与构建成功、数据库标准正确、结构规则无命中；工具链、入口脚本、`clang-tidy` 与 CTest 的完整检查见 `building-cpp` 的 `../../building-cpp/steps/03-check.md`。
