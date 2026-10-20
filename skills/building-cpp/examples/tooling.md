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

## 编译数据库指错目录

**差**：

```yaml
CompileFlags:
  CompilationDatabase: build   # 只有 build/clang 和 build/gcc 时，这里没有数据库
```

**好**：

```yaml
CompileFlags:
  CompilationDatabase: build/clang
```

切换 GCC 时改成 `build/gcc`；不要两套配置并存。

## 配置文件堆策略头

**差**：

```yaml
# 本项目遵循 Google C++ Style Guide，详见 docs/...
# 所有检查必须通过，禁止 NOLINT，禁止 ...
ColumnLimit: 100
```

**好**：

```yaml
# 100 列：模板和格式化串在 80 列下换行过碎。
ColumnLimit: 100
```

配置注释解释取值，不重复策略；策略在技能文档里。

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
  clang-analyzer-*,
  bugprone-*,
  cppcoreguidelines-*,
  google-*,
  modernize-*,
  performance-*,
  readability-*
CheckOptions:
  # 团队用 100 列，tidy 的列宽判断跟随 clang-format。
  readability-identifier-length.MinimumVariableNameLength: 2
```

保留主体；关闭项逐条写理由。

## tidy 扫描系统头

**差**：

```bash
clang-tidy -p build/clang --system-headers src/main.cpp
```

系统头也参与诊断，出现大量第三方告警。

**好**：

```bash
clang-tidy -p build/clang --header-filter='.*' \
  --warnings-as-errors='*' src/main.cpp
```

`--header-filter='.*'` 只看非系统头；系统头默认排除。

## 构建脚本里自动格式化

**差**：

```bash
clang-format -i src/*.cpp   # 构建时悄悄改源码
```

**好**：

```bash
clang-format --dry-run --Werror --fallback-style=Google "${sources[@]}"   # 只检查
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

同主版本；`--live` 会核对。Apple Clang 与 Homebrew 工具不同版本时，按 `references/environment.md` 的例外处理，不要强行降级。
