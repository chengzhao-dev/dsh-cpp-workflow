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

/// @throws std::out_of_range index 不在 [0, size()) 内。
[[nodiscard]] Task GetTask(int index) const;
```

`TryParseTask` 把失败作为正常结果返回。`GetTask` 的前提是调用方给出有效下标；越界时函数无法返回一个任务，抛标准库已有的 `std::out_of_range`。如果越界其实是正常输入，应该改成返回 `std::optional<Task>`，而不是让调用方捕获异常；只有项目需要把这种越界和别处的 `out_of_range` 区分开时，才定义派生类。

## 异常类型与消息

**差**：抛内建类型或裸字符串，调用方只能捕获一切。

```cpp
throw "bad index";
```

**好**：语义已经由标准类型给出时直接用标准类型；需要额外携带领域信息时，再派生自它。

```cpp
throw std::out_of_range{
    std::format("GetTask: index={} 超出 [0, {})", index, tasks_.size())};
```

消息写操作和关键值，不写「出错了」；`std::format` 只是构造消息的方式，不强制固定模板。项目若定义 `Error` 基类，按 `references/exceptions.md` 先定基类再派生，调用方捕获基类接住整族。

## Debug 与 Release 的三层合同

**差**：同一个函数在 Debug 抛异常、在 Release 返回 false；调用方被迫按构建模式写两套分支。

```cpp
#ifdef NDEBUG
return false;
#else
throw std::out_of_range{row, col};
#endif
```

**好**：返回值在两种模式完全一致；需要异常时两种模式都抛，只有 `what()` 的详略不同。

```cpp
// 返回值：失败是可恢复结果，两种模式都返回 false。
[[nodiscard]] bool TryPlace(CellPosition position, Player player) noexcept;

// 越界：两种模式都抛 std::out_of_range；Debug 消息可带 file:line。
void Place(CellPosition position, Player player);
```

越界用标准库已有的 `std::out_of_range`，调用方不需要认识项目私有类型；只有调用方必须把它和其它 `out_of_range` 区分开时，才定义派生类并在 `what()` 里补位置信息。

**差**：用 `assert` 承担 Release 也必须执行的 invariant 检查；`NDEBUG` 后检查消失。

```cpp
assert(game.GetResult() == GameResult::kInProgress);
```

**好**：两种模式都必须检查的 invariant 用 `Check`（项目保留时），失败时打印诊断并终止；只在开发期值得做、Release 可以省掉的自检用 `DebugCheck`。没有这两个宏时分别用 `assert` 与 `std::terminate`。

```cpp
Check(game.GetResult() == GameResult::kInProgress, "Ai::Choose: game is already over");
DebugCheck(index < history_.size(), "history index out of range");
```

`Check` 不是 `[[noreturn]]`：条件成立时正常返回。`DebugCheck` 在 `NDEBUG` 后展开为空，参数不能带副作用。

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
