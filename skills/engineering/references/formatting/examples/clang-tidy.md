# 正反例：clang-tidy

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
