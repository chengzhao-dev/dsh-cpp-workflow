# 正反例：clangd

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
