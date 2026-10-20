# 正反例：异常

## 抛还是返回

**差**：用异常表达可预期的解析失败。

```cpp
Task ParseTask(std::string_view line);  // 格式错误时抛 std::runtime_error
```

调用方被迫用 `try/catch` 做正常分支，且无法从类型看出失败。

**好**：结果类型表达可预期失败，合同违反才抛。

```cpp
enum class ParseError { kEmptyLine, kMissingPriority, kBadPriority };

struct ParseResult {
  std::optional<Task> task;
  ParseError error = ParseError::kEmptyLine;
};

[[nodiscard]] ParseResult TryParseTask(std::string_view line);

/// @throws std::out_of_range index 越界
[[nodiscard]] Task GetTask(int index) const;
```

`TryParseTask` 的失败是调用方每天都要处理的；`GetTask` 越界是调用方违反合同。

## 消息格式

**差**：

```cpp
throw std::out_of_range("bad index");
```

**好**：

```cpp
throw std::out_of_range{
    std::format("GetTask: index={} 超出 [0, {})", index, tasks_.size())};
```

消息含操作、关键值、期望范围；用 `std::format`，不拼字符串。

## 边界

**差**：每层都捕获并打印，异常被吞掉。

```cpp
void AddTask(Task task) {
  try {
    tasks_.push_back(task);
  } catch (const std::exception& error) {
    std::cout << error.what() << "\n";  // 库打印，且吞掉异常
  }
}
```

**好**：库让异常传播，入口统一翻译。

```cpp
// main.cpp
int main() {
  try {
    return Run(std::cin, std::cout);
  } catch (const std::exception& error) {
    std::cerr << std::format("错误: {}\n", error.what());
    return 1;
  }
}
```

## 捕获

**差**：

```cpp
try {
  Load(path);
} catch (...) {
  return;  // 不知道发生了什么，状态可能半坏
}
```

**好**：

```cpp
try {
  Load(path);
} catch (const std::filesystem::filesystem_error& error) {
  return LoadResult::kNotFound;
}
```

只捕获能处理的类型；其他异常继续抛。

## 析构

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

## `std::format` 与 `std::print`

C++20 没有 `std::print`。不要写：

```cpp
std::print("任务: {}\n", task.name);  // C++23
```

写：

```cpp
std::cout << std::format("任务: {}\n", task.name);
```
