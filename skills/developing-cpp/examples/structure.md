# 正反例：行为与边界

## 行为句

**差**：实现一个 `TaskList` 类，用 `std::vector` 保存任务，支持添加、删除、按优先级排序，并在终端打印表格。

问题：把类型、容器、实现步骤混进行为；无法验收「表格」长什么样。

**好**：

```text
给定一组任务（每行「优先级 名称」），程序按优先级从高到低输出名称；
输入为空时输出「没有任务」并返回 0；某行格式非法时输出行号并返回 1。
```

可以写成测试：输入三行，断言输出顺序；输入空，断言提示与退出码；输入坏行，断言行号。

## 边界

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

## 头文件位置

**差**：

```text
src/task_list.h                  // 公共头藏在 src，测试无法只依赖公共接口
src/detail.h                     // 私有头被测试直接包含
```

```cpp
#include "src/task_list.h"       // 从仓库根写到了实现目录
```

**好**：

```text
task_list/include/task_list.h    // 公共头
task_list/src/task_list.cpp       // 实现
task_list/src/detail.h           // 私有头，只被本组件包含
```

```cpp
#include "task_list/include/task_list.h"  // 从源码根写公共头的完整路径
```

构建时把仓库根加入 include 搜索路径；不要用 `#include "../task_list/include/task_list.h"` 这种随文件位置漂移的写法。

## 单文件何时拆库

**先不拆**：一个 `main.cpp`，辅助函数在匿名命名空间，只有程序自己用。

**该拆**：测试需要直接调用排序逻辑；或第二个程序要复用同一逻辑；或逻辑已经超过一个屏幕。

拆的时候先定公共头（只暴露 `SortedByPriority`），把实现移到 `src/`，行为句不变，测试先绿再改构建。
