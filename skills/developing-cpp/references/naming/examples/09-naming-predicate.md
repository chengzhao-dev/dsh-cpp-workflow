<!-- 读取时机：命名示例时；读完能回答：正反例：谓词与 Lambda；预算：一次只开这一份（18 行），不自动串联。 -->
# 正反例：谓词与 Lambda

**差**：

```cpp
bool valid(int value);
auto check = [](const Task& task) { return task.done; };
```

**好**：

```cpp
[[nodiscard]] bool IsValid(int value);
auto is_done = [](const Task& task) { return task.done; };
auto has_owner = [](const Task& task) { return !task.owner.empty(); };
```

返回 `bool` 的自由函数用 `Is` / `Has` / `Can` 开头；只有与成对规则一一对应时才用 `Completes`、`Would` 这类限定式；Lambda 用 snake_case 的 `is_` / `has_` / `can_`，读起来像条件。
