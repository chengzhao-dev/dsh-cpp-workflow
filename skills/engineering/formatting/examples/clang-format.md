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
