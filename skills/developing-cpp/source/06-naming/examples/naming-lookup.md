# 正反例：查找与读取

**差**：

```cpp
[[nodiscard]] Task GetTask(std::string_view name) const;  // 可能找不到时返回什么？
[[nodiscard]] bool FindTask(std::string_view name) const; // 返回 bool 却叫 Find
```

**好**：

```cpp
[[nodiscard]] const Task& GetTask(std::string_view name) const;  // 找不到抛 TaskNotFoundError
[[nodiscard]] const Task* FindTask(std::string_view name) const; // 找不到返回 nullptr
[[nodiscard]] bool HasTask(std::string_view name) const;         // 只回答存在性
```

`Get` 表示结果一定存在（否则抛出声明过的领域异常），`Find` 表示可能找不到，`Has` / `Contains` 只回答是否存在。不要用 `Find` 返回 `bool`。
