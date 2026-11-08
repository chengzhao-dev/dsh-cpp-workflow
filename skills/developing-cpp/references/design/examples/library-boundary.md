# 正反例：边界

**差**：库函数直接打印，程序只调用它。

```cpp
// task_list.cpp（库）
void TaskList::Print() const {
  for (const auto& task : tasks_) {
    std::cout << task.priority << " " << task.name << "\n";
  }
}
```

问题：库依赖终端，测试要捕获 `std::cout`，GUI 或文件输出无法复用。

**好**：库返回数据，程序决定怎么显示。

```cpp
// task_list.h（库）
[[nodiscard]] std::vector<Task> SortedByPriority() const;

// app/cli.cpp（程序）
void PrintTasks(const std::vector<Task>& tasks, std::ostream& out) {
  for (const auto& task : tasks) {
    out << std::format("{} {}\n", task.priority, task.name);
  }
}
```

测试直接断言 `SortedByPriority()`；输出格式由程序测试负责。
