<!-- 读取时机：抛异常或写异常契约时；读完能回答：正反例：什么时候抛；预算：一次只开这一份（27 行），不自动串联。 -->
# 正反例：什么时候抛

这些例子只用于开发阶段讨论源码写法。插件运行时不编译它们，也不执行它们。

**差**：用户输入格式错误是调用方每天都要处理的正常结果，却用异常表达，调用方被迫用 `try/catch` 做分支。

```cpp
Task ParseTask(std::string_view line);  // 任何格式错误都抛
```

**好**：接口把「解析可能失败」写进返回类型；只有函数无法完成自己的任务、继续执行没有意义时才抛。

```cpp
enum class ParseStatus { kOk, kEmptyLine, kMissingPriority, kBadPriority };

struct ParseResult {
  std::optional<Task> task;
  ParseStatus status = ParseStatus::kEmptyLine;
};

[[nodiscard]] ParseResult TryParseTask(std::string_view line);

/// @throws std::out_of_range index 不在 [0, size()) 内。
[[nodiscard]] Task GetTask(int index) const;
```

`TryParseTask` 把失败作为正常结果返回。`GetTask` 的前提是调用方给出有效下标；越界时函数无法返回一个任务，抛标准库已有的 `std::out_of_range`。如果越界其实是正常输入，应该改成返回 `std::optional<Task>`，而不是让调用方捕获异常；只有项目需要把这种越界和别处的 `out_of_range` 区分开时，才定义派生类。
