<!-- 读取时机：排版或工具配置时；读完能回答：正反例：clang-format；预算：一次只开这一份（47 行），不自动串联。 -->
# 正反例：clang-format

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

## 配置文件堆策略头

**差**：

```yaml
# 本项目遵循 Google C++ Style Guide，详见 docs/...
# 所有检查必须通过，禁止 NOLINT，禁止 ...
BasedOnStyle: Google
```

**好**：

```yaml
# Google 基线；本工程用 4 个空格缩进、120 列。
Language: Cpp
BasedOnStyle: Google
Standard: Latest
IncludeBlocks: Preserve
ColumnLimit: 120
IndentWidth: 4
TabWidth: 4
UseTab: Never
ContinuationIndentWidth: 8
AccessModifierOffset: -4
PackConstructorInitializers: BinPack
LineEnding: LF
```

配置只选基线，再写有意偏离的少量选项，不重复策略；列宽、缩进、tab 与包含分块仍以工程根 `.clang-format` 为准。需要新规则时先改技能文档并说明理由，不要在手写配置里堆本地约定。两例的差别在把策略写进配置头，以及列宽、缩进、tab 与对齐是否成套，不是能否设 `ColumnLimit`。
