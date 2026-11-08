# 正反例：多返回值

**差**：

```cpp
bool Parse(std::string_view text, int* out_value);   // 出参 + 返回 bool
```

**好**：

```cpp
struct ParseResult {
  bool ok{false};
  int value{0};
};

[[nodiscard]] ParseResult TryParse(std::string_view text);
```

需要同时表达成功与结果时，用带字段的结构体或 `std::optional`，不要用输出参数加布尔返回。
