<!-- 读取时机：抛异常或写异常契约时；读完能回答：正反例：捕获；预算：一次只开这一份（21 行），不自动串联。 -->
# 正反例：捕获

**差**：捕获一切后静默返回，状态可能已经半坏。

```cpp
try {
  Load(path);
} catch (...) {
  return;
}
```

**好**：只捕获当前层能处理的类型；不能处理的继续传播。`catch` 从派生到基类排序，`catch (...)` 只能最后兜底。

```cpp
try {
  Load(path);
} catch (const FileReadError& error) {
  return LoadResult::kNotFound;
}
```
