<!-- 读取时机：排版或工具配置时；读完能回答：正反例：clang-format；预算：一次只开这一份（38 行），不自动串联。 -->
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
ColumnLimit: 100
```

**好**：

```yaml
# 全部取 Google 预设：80 列、2 空格、不用 tab、包含顺序。
Language: Cpp
BasedOnStyle: Google
Standard: Latest
```

配置只选预设和语言版本，不重复策略；列宽、缩进、包含顺序都由 Google 预设决定。需要新规则时先改技能文档并说明理由，不要在手写配置里堆本地约定。两例的差别在把策略写进配置头，不是 `ColumnLimit`；要改列宽时按工程值设置并改技能依据。
