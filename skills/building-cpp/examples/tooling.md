# 正反例：工具配置

## `query-driver` 放错位置

**差**：

```yaml
# .clangd
CompileFlags:
  CompilationDatabase: build/clang
  Add:
    - --query-driver=/usr/bin/clang++
```

`--query-driver` 是 clangd 的命令行参数，不是 `.clangd` 的 YAML 键；写在这里不会生效。

**好**：

```yaml
# .clangd
CompileFlags:
  CompilationDatabase: build/clang
```

```jsonc
// .vscode/settings.json
{
  "clangd.arguments": [
    "--query-driver=/usr/bin/clang++",
    "--header-insertion=never",
    "--background-index"
  ]
}
```

## `.clangd` 写死标准

**差**：

```yaml
# 工程已经在 CMake 里声明 C++23
CompileFlags:
  CompilationDatabase: build/clang
  Add:
    - -std=c++20   # 覆盖 compile_commands.json，C++23 补全/诊断全部降级
```

**好**：

```yaml
CompileFlags:
  CompilationDatabase: build/clang
```

标准只来自 `compile_commands.json`。没有数据库时先回到定构建生成，不要在 `.clangd` 里猜一个 `-std`。

## 编译数据库指错目录

**差**：

```yaml
CompileFlags:
  CompilationDatabase: build/clang   # 项目已切到 GCC，这里仍读 clang 的数据库
```

**好**：

```yaml
CompileFlags:
  CompilationDatabase: build/gcc
```

`.clangd` 的目录必须与 `environment.json` 的 `compiler` 一致；默认 clang 用 `build/clang`，切换 GCC 时改成 `build/gcc`，不要两套配置并存。

## 配置文件堆策略头

**差**：

```yaml
# 本项目遵循 Google C++ Style Guide，详见 docs/...
# 所有检查必须通过，禁止 NOLINT，禁止 ...
ColumnLimit: 100
```

**好**：

```yaml
# 全部取 Google 预设：80 列、2 空格、不用 tab、包含顺序。
Language: Cpp
BasedOnStyle: Google
Standard: Latest
```

配置只选预设和语言版本，不重复策略；列宽、缩进、包含顺序都由 Google 预设决定。需要新规则时先改技能文档并说明理由，不要在手写配置里堆本地约定。

## 整族关闭检查

**差**：

```yaml
Checks: >
  -*,
  bugprone-*
```

只留一族，其他全关，且没有理由。

**好**：

```yaml
Checks: >
  -*,
  google-*,
  readability-identifier-naming
```

保留 Google 检查主体和项目命名规则；关闭项逐条写理由，不整族关闭。不设 `FunctionCase`，Google 允许 `count()` / `set_count()` 这类访问器。

## tidy 扫描系统头

**差**：

```bash
clang-tidy -p build/clang --system-headers src/main.cpp
```

系统头也参与诊断，出现大量第三方告警。

**好**：

```bash
clang-tidy -p build/clang --header-filter="^$(pwd -P)/(include|src)/" \
  --warnings-as-errors='*' src/main.cpp
```

`--header-filter` 只列项目顶层目录，避免把第三方头纳入；系统头默认排除。工程有别的顶层目录时按实际替换。

## 构建脚本里自动格式化

**差**：

```bash
clang-format -i src/*.cpp   # 构建时悄悄改源码
```

**好**：

```bash
clang-format --dry-run --Werror "${sources[@]}"   # 只检查
```

需要自动修复时单独运行 `clang-format -i`，由人确认 diff。

## 版本混装

**差**：

```text
clang++ 18, clang-format 17, clangd 16
```

格式化与诊断不同版本，CI 与本地结果不一致。

**好**：

```text
clang++ 18.1.8, clang-format 18.1.8, clang-tidy 18.1.8, clangd 18.1.8
```

同主版本；`--live` 会核对。Apple Clang 与 Homebrew 工具不同版本时，仍按同一 LLVM 主版本要求处理，不要强行降级或改声明绕过。

## 把标准差异当成检查项

**差**：

```yaml
# .clang-tidy
Checks: 'google-*,misc-*'
```

**好**：

```yaml
# .clang-tidy
Checks: '-*,google-*,readability-identifier-naming'
```

能不能写 `= default` 的比较运算符由语言标准决定，不是检查项的问题。`misc-non-private-member-variables-in-classes` 只在打开 `misc-*` 时出现；工作流基线不开这一族，工程配置要与基线相同，而不是给这条检查加忽略选项。
