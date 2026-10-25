# 触发与分流

三个技能在门禁之后才出现，触发问题因此只有两类：该出现的没出现（description 或门禁写窄了），不该出现的出现了（边界写宽了）。这一页把判据、正反例和维护规则放在一处；门禁本身见 [plugin-flow.md](plugin-flow.md)。

## 判据

技能是否被选中，只由 `SKILL.md` 的 `name` 和 `description` 决定，正文不参与路由。`description` 必须同时写清三件事：做什么、什么时候用、不用于什么；宁可写得主动一些，也不要靠正文里的补充说明去补触发。

| 技能 | 触发信号（出现任意一类） | 不触发（出现任意一类即排除） |
| --- | --- | --- |
| `developing-cpp` | 改 `.h` / `.hpp` / `.cpp` / `.cc` 的声明或实现；写或改源码注释；命名、异常、声明顺序、头文件契约；C++11–C++23 语言设施选型；补测试 target 里的测试代码 | 只改 `CMakeLists.txt`、`cmake/`、`running-build.sh`、`.clang-*`、`environment.json`；只改 `.qmd`、仓库 README、Python、非 C++ 文档 |
| `configuring-cmake` | 改 `CMakeLists.txt` 或 `cmake/`；target 拆分、公共 include、链接边界；`target_compile_features`、`CXX_STANDARD`、标准降档；GLOB、全局变量、RPATH、输出目录；抽取或导入 CMake 函数/模块；CMake 缩进、注释与排版 | 只改函数体、命名、异常或源码注释；只改 `running-build.sh` 或工具配置；只改 `.qmd`、README、Python |
| `building-cpp` | 改 `running-build.sh`、`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/`、`environment.json`；配置 Ninja 或换编译器；编译数据库、format/tidy/clangd 配置；在 CMake target 已就绪后跑构建、测试与运行 | 只改 target、属性、标准或模块；只改函数体语义、命名或异常；只改文档；不涉及构建文件的纯代码走查 |

三个技能同时出现时先开 `developing-cpp`。只改函数体、命名、异常或注释且入口命令可运行时，定实现后只开 `building-cpp` 的「通过检查」，不再重走构建三步。只改 CMake 时先开 `configuring-cmake`，完成前落到 `building-cpp` 的通过检查；一次改动同时碰到源码和 CMake 时，先源码、再 CMake、最后构建检查。

## 触发矩阵

| # | 用户请求 | 应出现 | 判定要点 |
| --- | --- | --- | --- |
| 1 | 「给 `Board::Place` 加越界判断」 | `developing-cpp` | 函数体与异常，落定实现 |
| 2 | 「这几个类注释写得像目录，帮我改」 | `developing-cpp` | 源码注释，落定声明与定实现 |
| 3 | 「新增一个 `Move` 类型，补到头文件」 | `developing-cpp` | 声明与头文件契约 |
| 4 | 「`@throws` 该不该写，把异常说清楚」 | `developing-cpp` | 异常契约，落定声明 |
| 5 | 「C++23 里这里用 `std::expected` 还是 `optional`」 | `developing-cpp` | 标准设施选型 |
| 6 | 「这几个测试的注释也按同一标准改」 | `developing-cpp` | 测试也是源码 |
| 7 | 「CMake 里把 `logging` 拆成 static target」 | `configuring-cmake` | target 与链接边界 |
| 8 | 「`clang-tidy` 报了 `bugprone-*`，配置怎么调」 | `building-cpp` | 工具配置 |
| 9 | 「`compile_commands.json` 没生成，clangd 不跳转」 | `building-cpp` | 编译数据库与 clangd |
| 10 | 「Ninja 下链接失败，找不到 `greeting`」 | `configuring-cmake` | target 不存在或链接边界 |
| 11 | 「把工程从 C++20 降到 C++17」 | `configuring-cmake`，再 `building-cpp` | CMake 标准与工具档位一起降 |
| 12 | 「`running-build.sh` 的 format 那步失败」 | `building-cpp` | 构建脚本与工具 |
| 13 | 「同时改 `board.cpp` 和 `CMakeLists.txt`」 | 三个都出现，先 `developing-cpp` | 跨边界，先源码、再 CMake、最后构建 |
| 14 | 「只改 `Game` 的函数体，入口能跑」 | `developing-cpp`，之后只到「通过检查」 | 增量的最短路径 |

## 反例

| # | 用户请求 | 应出现 | 原因 |
| --- | --- | --- | --- |
| 15 | 「把这一章 `.qmd` 的错别字改掉」 | 都不出现 | Quarto 正文不归本插件 |
| 16 | 「更新仓库 README 的安装说明」 | 都不出现 | 非 C++ 文档 |
| 17 | 「修一下仓库里的 Python 检查脚本」 | 都不出现 | Python 不归本插件 |
| 18 | 「解释一下 C++ 的虚函数表」 | 都不出现 | 概念问答，不动工程 |
| 19 | 「这个仓库有 CMake 和 `.cpp`，但没装项目技能」 | 都不出现 | 门禁只认项目技能标记 |
| 20 | 「在非 git 目录里新建一个 C++ 文件」 | 都不出现 | 没有 git 根，没有门禁边界 |

## 验证与维护

- 结构检查：`scripts/checking-skill-links.mjs` 要求本页存在、三个技能的 description 关键词（`CMake`、`Ninja`、`clang-format`、`clang-tidy`、`clangd`、`C++23`、`target`、`注释`、`异常`、`命名`）都能在本页找到，且正例与反例各不少于 6 行。
- 人工抽样：改 description 或步骤表后，用 8–10 条正例、8–10 条反例各跑 3 次，触发率低于一半就改 description 的信号词，不改正文。
- 改 `SKILL.md` 的 `description` 必须同改本页的判据表与矩阵；只改矩阵不改 description，等于没改。
- 「四类改动」的入口表在每个技能的 `SKILL.md`，维护镜像在 `docs/architecture.md` 的「三个技能的四类改动」；改入口或域划分时两处同改，本页只判技能是否该出现。
