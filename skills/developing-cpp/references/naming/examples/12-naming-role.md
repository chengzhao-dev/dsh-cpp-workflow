<!-- 读取时机：命名示例时；读完能回答：正反例：语义角色；预算：一次只开这一份（21 行），不自动串联。 -->
# 正反例：语义角色

**差**：

```cpp
bool Check(int id) const;                  // Check 什么？
Result DoSomething(Task task);            // 做什么？
TaskState To(TaskState state);            // 从什么到什么？
```

**好**：

```cpp
[[nodiscard]] bool HasId(int id) const;
[[nodiscard]] ParseResult TryParse(std::string_view text);
[[nodiscard]] TaskState StatusCodeToTaskState(int code);
```

- 判断用 `Is` / `Has`。
- 可能失败但不抛用 `Try`。
- 映射名字含两端角色。
