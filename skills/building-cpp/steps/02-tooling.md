# 第 2 步：定工具配置

## 产出

工程自己的 `.clang-format`、`.clang-tidy`、`.clangd` 和编辑器推荐配置。三份配置各管一段：格式化、静态检查、语言服务，不互相复制规则。

## 通用情况

- 工程拥有配置：`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/` 放在工程根；不要依赖用户主目录或插件目录里的同名文件。
- 只复制缺失的文件。已有配置先读再改，不覆盖；需要合并时逐项说明理由。
- 工具角色固定：`clang-format` 管排版，`clang-tidy` 管静态诊断，`clangd` 管补全/跳转/诊断；无论 `compiler` 是 clang 还是 gcc，这三件都用 Clang 工具链。
- 版本要求见 `references/environment.md`：Clang 模式要求 `clang++`、`clang-format`、`clang-tidy`、`clangd` 同一 LLVM 主版本；GCC 模式要求 `clang-format` / `clang-tidy` ≥ 16，`clangd` 只要求可用。
- `.clangd` 的 `CompilationDatabase` 指向 `build/<compiler>`；切换编译器时同步改，不能留旧目录。**不要写 `-std`**：它会覆盖 `compile_commands.json`，把 C++23 工程降成旧标准；标准只由构建声明和编译数据库决定。
- `--query-driver` 是 clangd 的命令行参数，写在 `.vscode/settings.json` 的 `clangd.arguments` 里，不是 `.clangd` 的 YAML 键。它告诉 clangd 允许执行哪个编译器驱动来取系统头路径；路径写绝对路径，并与 `environment.json` 的编译器一致。
- 首次复制时按轴替换三处：`compiler=clang` 用 `CompilationDatabase: build/clang`、`--query-driver=/usr/bin/clang++` 和 `cmake.debugConfig` 的 `MIMode: lldb` / `miDebuggerPath: /usr/bin/lldb`；`compiler=gcc` 用 `build/gcc`、`/usr/bin/g++` 和 `MIMode: gdb` / `/usr/bin/gdb`。只复制模板而不改这三处，GCC 模式会指向错误的数据库、驱动或调试器。原工程已有的 `.clangd` 不覆盖；要改先征得同意。
- `.clang-format` 保留 `Language: Cpp`、`BasedOnStyle: Google` 和 `Standard`：模板资产写 `Latest`；工程按 `environment.json` 声明 C++11–C++20 时，把 `Standard` 改成 `c++NN`（映射见 `references/standards/README.md`）。clang-format 21/22 的 `Standard` 不接受 `c++23`，所以 C++23 工程仍写 `Latest`。列宽 80、每级 2 空格、不用 tab、包含顺序都取 Google 预设；不要覆盖 `ColumnLimit`、`TabWidth`、`IncludeCategories` 或指针对齐。需要新规则时先改 `references/google-cpp-style.md` 并说明理由。
- `.clang-tidy` 用 `Checks: '-*, google-*, portability-avoid-pragma-once, readability-identifier-naming'`，保留 `WarningsAsErrors: '*'` 和 `FormatStyle: file`。`google-*` 覆盖 Google 风格能静态检查的部分；`readability-identifier-naming` 只配项目确实统一的命名项：类型/枚举/别名/模板参数 PascalCase，变量/参数/成员 snake_case，类成员尾随 `_`，结构体成员不尾随，常量 `k` + PascalCase。不要设 `FunctionCase`，Google 允许 `count()` / `set_count()` 这类访问器；`portability-avoid-pragma-once` 要打开，因为工程统一用路径式守卫；不要重新打开 `cppcoreguidelines-*` 整包。
- `.clang-tidy` 关闭项和例外必须写理由；不要借 `-*` 之后再打开 `cppcoreguidelines-*` 这类非 Google 整族检查。
- `.vscode/extensions.json` 推荐 clangd、CMake Tools 与 C/C++ 扩展；`.vscode/settings.json` 固定 clangd 参数、CMake 构建目录和 `cmake.debugConfig`。配置、构建、运行和调试只从 CMake Tools 进入，不写 `tasks.json` 或 `launch.json`；C/C++ 扩展只作为 CMake 快速调试的后端，IntelliSense 关闭，避免和 clangd 并行。配置注释用 JSONC 的 `//`，贴在被解释的键上方。
- 配置注释写「为什么这样设」，不写「这一项是什么」；不写策略头、不指向文档路径。
- 格式化与静态检查只扫描项目源码：`src/`、`include/`、`apps/`、`tests/` 等实际存在的源码根；不扫描 `build/`、第三方目录、生成文件。
- `clang-tidy` 用 `-p build/<compiler>` 读取编译数据库，`--header-filter` 只列项目根下的顶层目录，避免把第三方头纳入；不要加 `--system-headers`，也不要用 clang-tidy 19 才加入、16 没有的 `--exclude-header-filter`。
- 格式化用 `--dry-run --Werror` 做检查；需要自动修复时单独运行 `-i`，不要让构建脚本悄悄改源码。
- 工程模板里不预置 `compile_commands.json`；它由定构建的 configure 生成，是构建产物。

## 情况

**新工程**：从 `assets/config/` 复制 `.clang-format`、`.clang-tidy`、`.clangd` 和 `.vscode/` 下的 `extensions.json`、`settings.json`，按编译器的映射改 `.clangd` 的编译数据库目录、`.vscode/settings.json` 的 `--query-driver` 路径和 `cmake.debugConfig` 的调试后端。不要复制 `build/`。

**已有工程**：新工程默认 C++23；已有工程按 `environment.json` 的 `standard` 对齐 CMake target 与 `.clang-format`，不要只改一处。先跑一次 `clang-format --dry-run --Werror` 和 `clang-tidy`，看现有配置实际报什么；只改导致当前失败或与声明环境冲突的项。不要借机重排全工程格式。

**换编译器**：改 `.clangd` 的 `CompilationDatabase`，改 `--query-driver` 指向的编译器，清理旧构建目录；不要同时保留两套 clangd 配置。

**GCC 模式**：`clangd` 仍可工作，但系统头来自 GCC；`--query-driver` 指向 `g++`。`clang-format` / `clang-tidy` 仍是 Clang 工具，版本要求不因编译器是 GCC 而降低。

**共享库**：静态检查不因链接方式改变；运行时库路径在定构建的 CMake 里设置，不要写进 clang 配置。

## 正反例指针

- `.clangd` 指错编译数据库、`query-driver` 写进 YAML：`examples/tooling.md`。
- 配置文件堆策略头、关闭检查不写理由：`examples/tooling.md`「配置注释」。
- 工具调用与头文件过滤：`references/static-analysis.md`。
- 每个标准对应的 clang-format 档位与 `.clangd` 读库规则：`references/standards/README.md`。
