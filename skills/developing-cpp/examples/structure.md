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

## 固定坐标用表

**差**：每次判断成线，都用循环把八条线的坐标重新拼一遍；行、列、对角线混在一个循环里，读者要跟着跑两遍才知道哪八条。

```cpp
// 差：用循环现写八条线，坐标藏在控制流里。
std::vector<std::vector<CellPosition>> BuildLines() {
  std::vector<std::vector<CellPosition>> lines;
  for (int row = 0; row < kRows; ++row) { /* ... */ }
  // 列与两条对角线再各写一段
  return lines;
}
```

**好**：固定坐标写成具名命名空间里的 `constexpr` 常量表，`HasLine` 与 `IsLineComplete` 共用，所以不放进任何一个函数体；格子用 `at()`，整条线 `all_of`、八条线 `any_of`，函数不标 `noexcept`。

```cpp
// board.cpp 的 namespace tictactoe：行、列、对角线三组，坐标固定。
constexpr std::array<std::array<CellPosition, 3>, 8> kLines{{
    {{{0, 0}, {0, 1}, {0, 2}}},  // 行 0
    {{{1, 0}, {1, 1}, {1, 2}}},  // 行 1
    {{{2, 0}, {2, 1}, {2, 2}}},  // 行 2
    {{{0, 0}, {1, 0}, {2, 0}}},  // 列 0
    {{{0, 1}, {1, 1}, {2, 1}}},  // 列 1
    {{{0, 2}, {1, 2}, {2, 2}}},  // 列 2
    {{{0, 0}, {1, 1}, {2, 2}}},  // 对角线
    {{{0, 2}, {1, 1}, {2, 0}}},  // 反对角线
}};
```

每个格子要分别处理时仍写 `row` / `col` 循环，例如收集空格、终端打印。

## 推演一步读原数据

**差**：先复制整个棋盘，再在副本上落子，最后判断成线；调用方看不出副本只是中间量。

```cpp
Board hypothetical = *this;
hypothetical.PlaceCell(position, cell_type);
return hypothetical.HasLine(cell_type);
```

**好**：判断「这一格换成某种棋子后会不会成线」不需要第二份棋盘。越界、空格、已占用仍按 `PlaceCell` 的拒绝条件返回 `false`；通过之后只在包含该坐标的线上把这一格算作 `cell_type`，其余格子读原棋盘。

```cpp
bool Board::IsLineComplete(CellPosition position, CellType cell_type) const {
  if (!IsInRange(position) || cell_type == CellType::kEmpty) {
    return false;
  }
  if (cells_.at(position.row).at(position.col) != CellType::kEmpty) {
    return false;
  }

  const auto matches = [&](CellPosition cell) {
    if (cell.row == position.row && cell.col == position.col) {
      return true;
    }
    return cells_.at(cell.row).at(cell.col) == cell_type;
  };

  return std::ranges::any_of(kLines, [&](const auto& line) {
    const bool contains = std::ranges::find_if(line, [&](CellPosition cell) {
                            return cell.row == position.row && cell.col == position.col;
                          }) != line.end();
    return contains && std::ranges::all_of(line, matches);
  });
}
```

先用 `IsInRange` 拒绝越界，再用 `at()` 读取；失败路径不碰数组，`noexcept` 也就不再成立。
