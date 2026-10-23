# 正反例：命名

## 基本规则

| 差 | 好 | 原因 |
| --- | --- | --- |
| `class task_list` | `class TaskList` | 类型 PascalCase |
| `void add_task()` | `void AddTask()` | 函数 PascalCase |
| `int TaskCount` | `int task_count` | 变量 snake_case |
| `std::vector<Task> Tasks` | `std::vector<Task> tasks_` | 成员 snake_case + `_` |
| `constexpr int MAX = 10` | `constexpr int kMaxTasks = 10` | 常量 `k` 前缀 |
| `enum class Color { Red }` | `enum class Color { kRed }` | 枚举子 `k` 前缀 |

## 访问器

**差**：

```cpp
Order current_order() const;   // 成员名直接当函数名
void set_current_order(Order order);
```

**好**：

```cpp
[[nodiscard]] Order GetCurrentOrder() const;
void AdvanceOrder();             // 领域动作，不是 setter
```

查询统一 `Get` + PascalCase；修改用领域动词。只有真正需要替换值时，才考虑 `Set` 形式，并说明为什么不是动作。

## 语义角色

**差**：

```cpp
bool Check(int id) const;                  // Check 什么？
Result DoSomething(Task task);            // 做什么？
TaskState To(TaskState state);            // 从什么到什么？
```

**好**：

```cpp
[[nodiscard]] bool Contains(int id) const;
[[nodiscard]] ParseResult TryParse(std::string_view text);
[[nodiscard]] TaskState StatusCodeToTaskState(int code);
```

- 判断用 `Is` / `Has`。
- 可能失败但不抛用 `Try`。
- 映射名字含两端角色。

## `current_` 前缀

**差**：

```cpp
Order current_order_;   // 只有一个订单时，current 是噪音
```

**好**：

```cpp
Order order_;
```

**该用**：

```cpp
Order current_order_;   // 有 current_order_ 与 next_order_，不写会混
```

## 名字与职责

**差**：

```cpp
class DataManager {};     // 管什么？
class StringHelper {};    // 为什么是类？
```

**好**：

```cpp
class Warehouse {};       // 持有库存，维持不变量
namespace string_utils {  // 一组自由函数
[[nodiscard]] std::string Trim(std::string_view text);
}
```

避免 `Manager`、`Helper`、`Util`；名字要能回答「它负责什么」。一组无状态函数用命名空间，不要造类。

## 查找与读取

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

## 谓词与 Lambda

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

返回 `bool` 的自由函数用 `Is` / `Has` / `Can` / `Should` 开头；Lambda 用 snake_case 的 `is_` / `has_` / `can_`，读起来像条件。

## 多返回值

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

## 改名检查

- 搜全部调用点：声明、定义、测试、注释、文档。
- 先改声明，再改定义，再改调用点；每一步都能编译。
- 公共 API 改名保留旧名转发时，注释写弃用期限；不要静默删除。
