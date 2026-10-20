# 第 6 步：定工具配置

## 产出

工程自己的 `.clang-format`、`.clang-tidy`、`.clangd` 和编辑器推荐配置。三份配置各管一段：格式化、静态检查、语言服务，不互相复制规则。

## 通用情况

- 工程拥有配置：`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/` 放在工程根；不要依赖用户主目录或插件目录里的同名文件。
- 只复制缺失的文件。已有配置先读再改，不覆盖；需要合并时逐项说明理由。
- 工具角色固定：`clang-format` 管排版，`clang-tidy` 管静态诊断，`clangd` 管补全/跳转/诊断；无论 `compiler` 是 clang 还是 gcc，这三件都用 Clang 工具链。
- 版本要求见 `references/environment.md`：Clang 模式要求 `clang++`、`clang-format`、`clang-tidy`、`clangd` 同一 LLVM 主版本；GCC 模式要求 `clang-format` / `clang-tidy` ≥ 16，`clangd` 只要求可用。
- `.clangd` 的 `CompilationDatabase` 指向 `build/<compiler>`；切换编译器时同步改，不能留旧目录。
- `--query-driver` 是 clangd 的命令行参数，写在 `.vscode/settings.json` 的 `clangd.arguments` 里，不是 `.clangd` 的 YAML 键。它告诉 clangd 允许执行哪个编译器驱动来取系统头路径；路径写绝对路径，并与 `environment.json` 的编译器一致。
- 首次复制时按轴替换两个值：`compiler=clang` 用 `CompilationDatabase: build/clang` 和 `--query-driver=/usr/bin/clang++`；`compiler=gcc` 用 `build/gcc` 和 `/usr/bin/g++`。只复制模板而不改这两处，GCC 模式会指向错误的数据库或驱动。原工程已有的 `.clangd` 不覆盖；要改先征得同意。
- `.clang-format` 固定 `BasedOnStyle: Google`、`Standard: c++20`、`ColumnLimit: 100`、`DerivePointerAlignment: false`、`PointerAlignment: Left`；`IncludeCategories` 维持包含顺序。不要逐项手调换行。
- `.clang-tidy` 保留 `clang-analyzer-*`、`bugprone-*`、`cppcoreguidelines-*`、`google-*`、`modernize-*`、`performance-*`、`readability-*` 的主体；关闭项必须写理由。不要把整个检查族一关了之。
- `.vscode/extensions.json` 推荐 clangd 与 CMake Tools；`.vscode/settings.json` 固定 clangd 参数和 CMake 构建目录。配置注释用 JSONC 的 `//`，贴在被解释的键上方。
- 配置注释写「为什么这样设」，不写「这一项是什么」；不写策略头、不指向文档路径。
- 格式化与静态检查只扫描项目源码：`src/`、`include/`、`apps/`、`tests/` 等实际存在的源码根；不扫描 `build/`、第三方目录、生成文件。
- `clang-tidy` 用 `-p build/<compiler>` 读取编译数据库，`--header-filter='.*'` 只看非系统头；不要加 `--system-headers`。
- 格式化用 `--dry-run --Werror` 做检查；需要自动修复时单独运行 `-i`，不要让构建脚本悄悄改源码。
- 工程模板里不预置 `compile_commands.json`；它由第 5 步的 configure 生成，是构建产物。

## 情况

**新工程**：从 `assets/config/` 复制四份文件，按上表的编译器映射改 `.clangd` 的编译数据库目录和 `.vscode/settings.json` 的 `--query-driver` 路径。不要复制 `build/`。

**已有工程**：先跑一次 `clang-format --dry-run --Werror` 和 `clang-tidy`，看现有配置实际报什么；只改导致当前失败或与声明环境冲突的项。不要借机重排全工程格式。

**换编译器**：改 `.clangd` 的 `CompilationDatabase`，改 `--query-driver` 指向的编译器，清理旧构建目录；不要同时保留两套 clangd 配置。

**GCC 模式**：`clangd` 仍可工作，但系统头来自 GCC；`--query-driver` 指向 `g++`。`clang-format` / `clang-tidy` 仍是 Clang 工具，版本要求不因编译器是 GCC 而降低。

**共享库**：静态检查不因链接方式改变；运行时库路径在第 5 步的 CMake 里设置，不要写进 clang 配置。

## 正反例指针

- `.clangd` 指错编译数据库、`query-driver` 写进 YAML：`examples/tooling.md`。
- 配置文件堆策略头、关闭检查不写理由：`examples/tooling.md`「配置注释」。
- 工具调用与头文件过滤：`references/static-analysis.md`。
