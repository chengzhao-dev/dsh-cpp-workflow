# 静态分析与语言服务

三件工具各管一段：`clang-format` 排版、`clang-tidy` 诊断、`clangd` 提供补全/跳转/诊断。它们都读同一份编译数据库，但职责不重叠。

## clang-format

```bash
clang-format --dry-run --Werror src/*.cpp include/*.h tests/*.cpp
```

- 检查用 `--dry-run --Werror`；需要自动修复时单独跑 `clang-format -i`，不要在构建脚本里悄悄改源码。
- 工程必须有根 `.clang-format`；缺失时先复制配置，不要回退到内置风格，回退会掩盖配置缺失。
- 只扫描项目源码：`src/`、`include/`、`apps/`、`tests/` 等实际存在的目录；不扫描 `build/`、第三方、生成文件。
- 配置文件在工程根 `.clang-format`；不要依赖用户主目录或编辑器内置配置。
- `ColumnLimit: 100`、`Standard: c++20`、`BasedOnStyle: Google`；`IncludeCategories` 维持包含顺序。
- 格式化失败就是失败，不要用 `// clang-format off` 绕过；确需关闭时只包住无法排版的宏或表格，并写一句理由。

## clang-tidy

```bash
clang-tidy -p build/clang \
  --header-filter="^$(pwd -P)/(include|src|apps|tests)/" \
  --warnings-as-errors='*' \
  src/*.cpp apps/*.cpp tests/*.cpp
```

- `-p` 指向当前编译器的构建目录，读取 `compile_commands.json`。
- `--header-filter` 控制哪些头文件的诊断被显示，不改变 clang-tidy 实际解析哪些头；模板实例化可能让一条根因产生多条警告，警告条数不等于缺陷条数。按根因修，不要按条数修。
- `--header-filter` 用项目头目录的白名单，不要用 `.*` 把系统头和第三方头一并纳入。clang-tidy 按绝对路径匹配，所以上面用 `$(pwd -P)` 前缀；上面是常见目录，工程用别的顶层目录时按实际替换。`--exclude-header-filter` 到 clang-tidy 19 才加入，16/17/18 都没有，不要依赖它。
- 系统头默认被排除，不要加 `--system-headers`。
- 只扫描项目源文件；不要把 `build/` 或第三方源码传给 clang-tidy。
- `--warnings-as-errors='*'` 把警告当失败；修代码，不要新增 `NOLINT`。确需抑制时写 `// NOLINT(检查名): 理由`，理由必须具体。
- 配置在工程根 `.clang-tidy`；关闭项逐条写理由，不整族关闭。`cppcoreguidelines-pro-bounds-constant-array-index` 不能整族关闭；优先把下标换成 `at()` 或带边界检查的辅助函数，并补负向越界测试。
- 没有编译数据库时先回到 `building-cpp` 的定构建生成；不要用 `--` 手工拼编译参数绕过。
- `clang-tidy` 的诊断可能指向头文件；修头文件里的声明或实现，不要只改调用点。

## clangd

`.clangd`：

```yaml
CompileFlags:
  CompilationDatabase: build/clang
  Add:
    - -std=c++20
    - -Wall
    - -Wextra
Diagnostics:
  Suppress:
    - pp_file_not_found
```

- `CompilationDatabase` 指向当前编译器目录；GCC 模式改 `build/gcc`。
- `Add` 只补编译数据库里没有的公共选项；不要重复 `-I` 项目 include（数据库里已有）。
- 静态检查规则只在 `.clang-tidy` 里维护；clangd 读取同一份配置，不要在这里复制检查列表。
- `Suppress` 只放确实无法避免的解析噪声（如 `pp_file_not_found`），并写理由。

`--query-driver`：

- 它是 clangd 的命令行参数，不是 `.clangd` 的 YAML 键。
- 作用：允许 clangd 执行编译器驱动，读取系统头路径；只对编译数据库里出现的驱动生效。
- 写在 `.vscode/settings.json`：

```jsonc
{
  "clangd.arguments": [
    "--query-driver=/usr/bin/clang++",
    "--header-insertion=never",
    "--background-index"
  ]
}
```

- 路径用绝对路径；多个驱动用逗号分隔。GCC 模式指向 `/usr/bin/g++`。
- 不要写 `--query-driver=*` 或宽泛的 glob；这等于允许 clangd 执行任意匹配的驱动。
- 如果编译数据库里的编译器是相对路径，clangd 可能拒绝执行；用绝对路径重新 configure。
- `--query-driver` 只影响 clangd，不影响 clang-tidy；tidy 用编译数据库里的命令。

## 编辑器

`.vscode/extensions.json` 推荐：

```json
{
  "recommendations": ["llvm-vs-code-extensions.vscode-clangd", "ms-vscode.cmake-tools"]
}
```

`.vscode/settings.json` 固定：

```jsonc
{
  "clangd.arguments": [
    "--query-driver=/usr/bin/clang++",
    "--header-insertion=never",
    "--background-index"
  ],
  "cmake.buildDirectory": "${workspaceFolder}/build/clang",
  "cmake.generator": "Ninja"
}
```

- 不推荐与 clangd 冲突的 C++ 智能提示插件；只保留一个语言服务。
- 不把 `compile_commands.json` 提交进仓库；它是构建产物。
- 切换编译器时同时改 `.clangd`、`settings.json` 和构建目录；三处不一致会让诊断指向旧代码。

## 门禁分级

`--warnings-as-errors='*'` 是默认门禁。若项目必须把一组诊断先设为观察项，按检查名逐条写进项目脚本，不按 `*` 整族降级：

| 级别 | 典型检查 | 处理 |
| --- | --- | --- |
| 失败 | `bugprone-*`、`readability-math-missing-parentheses`、`readability-identifier-naming`、项目声明的致命集 | 修代码；不允许用 NOLINT 掩盖 |
| 失败 | 编译诊断、链接诊断、格式检查 | 直接失败 |
| 观察 | 迁移期暂时无法修完的 `modernize-*` | 在项目技能里列清单、写负责人和退出条件；不默认全仓关闭 |

- 致命集宁可小、可解释，也不要把所有检查一刀切。
- 观察项不是免死金牌：新代码不应新增观察项，已有项只能减少。
- 关闭某条检查时，在 `.clang-tidy` 里写一行理由，并在项目技能里记录退出条件。

## 版本与一致性

- `clang-format` / `clang-tidy` ≥ 16；clang 模式下与 `clang++`、`clangd` 同主版本。
- 混版本常见症状：格式化结果与 CI 不同、clangd 诊断与 tidy 不一致、选项被静默忽略。
- 检查器在 `--live` 时核对版本；不要用「能跑就行」绕过。

## 失败分诊

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| `clang-tidy` 报找不到编译数据库 | 没 configure 或路径错 | 回到 `building-cpp` 的定构建生成 `build/<compiler>/compile_commands.json` |
| clangd 报找不到系统头 | 编译数据库里的编译器是相对路径 | 用绝对路径重新 configure，或配 `--query-driver` |
| 格式化结果与 CI 不同 | 版本不同或配置不是工程根那份 | 统一版本，确认 `.clang-format` 在工程根 |
| tidy 报系统头 | 加了 `--system-headers` 或 header-filter 过宽 | 去掉 `--system-headers`，用项目头目录白名单 |
| 大量 `readability-*` | 代码风格未统一 | 回到 `developing-cpp` 的定声明 / 定实现修声明与实现，不要批量 NOLINT |
| clangd 与 tidy 诊断不一致 | 两者读的数据库/版本不同 | 统一 `CompilationDatabase` 与工具版本 |
