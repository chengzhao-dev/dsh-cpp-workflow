# 正反例：异常

这些例子只用于开发阶段讨论源码写法。插件运行时不编译它们，也不执行它们。

## 什么时候抛

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

/// @throws TaskIndexError index 不在 [0, size()) 内。
[[nodiscard]] Task GetTask(int index) const;
```

`TryParseTask` 把失败作为正常结果返回。`GetTask` 的前提是调用方给出有效下标；下标无效时函数无法返回一个任务，于是抛出带领域语义的 `TaskIndexError`。如果越界其实是正常输入，应该改成返回 `std::optional<Task>`，而不是让调用方捕获异常。

## 异常类型与消息

**差**：抛内建类型或裸字符串，调用方只能捕获一切。

```cpp
throw "bad index";
```

**好**：定义有语义的类型；确实没有更多信息时，才直接用标准库通用类型。

```cpp
class TaskIndexError : public std::out_of_range {
 public:
  explicit TaskIndexError(const std::string& message)
      : std::out_of_range(message) {}
};

throw TaskIndexError{
    std::format("GetTask: index={} 超出 [0, {})", index, tasks_.size())};
```

消息写操作和关键值，不写「出错了」；`std::format` 只是构造消息的方式，不强制固定模板。

## 多语义类型：Boost.Exception 风格

一个错误可以同时属于多个类别。类型只做 `catch` 的标签，数据由基类或错误信息容器携带；多继承时用 virtual 基类，避免 `catch (const std::exception&)` 二义性。

```cpp
struct exception_base : virtual std::exception, virtual boost::exception {};
struct io_error : virtual exception_base {};
struct file_error : virtual io_error {};
struct read_error : virtual io_error {};
struct file_read_error : virtual file_error, virtual read_error {};
```

这只是设计典范，不要求引入 Boost。项目自己的异常层级也可以照这个形状写。

## 捕获

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

## 边界

**差**：库代码捕获后打印并吞掉异常。

```cpp
void AddTask(Task task) {
  try {
    tasks_.push_back(task);
  } catch (const std::exception& error) {
    std::cout << error.what() << "\n";  // 库打印，且吞掉异常
  }
}
```

**好**：库让异常向上传播，入口统一翻译成用户可读的诊断。

```cpp
int main() {
  try {
    return Run(std::cin, std::cout);
  } catch (const std::exception& error) {
    std::cerr << std::format("错误: {}\n", error.what());
    return 1;
  }
}
```

退出码由项目入口合同决定；这里只示范「捕获、打印、非零返回」。

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

C++23 且标准库支持 `std::print` 时，程序入口或 CLI 可以写：

```cpp
std::print("任务: {}\n", task.name);
```

库代码、以及需要兼容 C++11–C++20 的代码仍写：

```cpp
std::cout << std::format("任务: {}\n", task.name);
```
