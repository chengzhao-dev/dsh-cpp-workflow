# clang-format

三件语言工具各管一段：`clang-format` 排版、`clang-tidy` 诊断、`clangd` 提供补全/跳转/诊断。它们都读同一份编译数据库，但职责不重叠。编辑器侧只保留 CMake Tools 作为配置、构建、运行和调试入口；C/C++ 扩展只做 `CMake: Debug` 的调试后端，不参与语言服务。

```bash
clang-format --dry-run --Werror src/*.cpp include/*.h tests/*.cpp
```

- 检查用 `--dry-run --Werror`；需要自动修复时单独跑 `clang-format -i`，不要在构建脚本里悄悄改源码。
- 工程必须有根 `.clang-format`；缺失时先复制配置，不要回退到内置风格，回退会掩盖配置缺失。
- 只扫描项目源码：`src/`、`include/`、`apps/`、`tests/` 等实际存在的目录；不扫描 `build/`、第三方、生成文件。
- 配置文件在工程根 `.clang-format`；不要依赖用户主目录或编辑器内置配置。
- `BasedOnStyle: Google`、`Standard: Latest`；clang-format 21/22 不接受 `c++23`，`Latest` 按工具支持的最高标准解析。列宽、缩进与包含顺序以工程根 `.clang-format` 为准；工程显式写 `ColumnLimit` 时按工程值执行，模板资产不写 `ColumnLimit`。
- 格式化失败就是失败，不要用 `// clang-format off` 绕过；确需关闭时只包住无法排版的宏或表格，并写一句理由。
