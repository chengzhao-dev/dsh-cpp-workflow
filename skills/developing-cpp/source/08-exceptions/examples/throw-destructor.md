# 正反例：析构

**差**：

```cpp
~Writer() {
  if (file_) file_->Flush();  // 失败时抛？析构中抛会终止程序
}
```

**好**：

```cpp
~Writer() {
  if (file_) {
    file_->Flush();  // 忽略失败：析构不抛，错误由 Close() 报告
  }
}
```

需要报告关闭失败时，提供显式 `Close()` 返回结果，析构只做兜底。
