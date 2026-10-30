# 声明顺序

顺序的作用是让读者先看类型和契约，再看数据。`clang-format` 不管顺序，靠人工和 review 维持。

## 类声明

```cpp
class TaskTable {
 public:
  // 1. 类型与别名
  using Tasks = std::array<TaskState, 16>;

  // 2. 静态常量
  static constexpr int kTaskCount = 16;

  // 3. 工厂
  static TaskTable CreateEmpty();

  // 4. 构造、赋值、析构
  TaskTable();
  TaskTable(const TaskTable&) = default;
  TaskTable& operator=(const TaskTable&) = default;
  ~TaskTable();

  // 5. 其他成员函数
  [[nodiscard]] bool Contains(int id) const;
  [[nodiscard]] TaskState GetTaskState(int id) const;
  void SetTaskState(int id, TaskState state);

  // 6. 数据成员
 private:
  Tasks tasks_{};
  bool is_open_ = false;
};
```

- `struct` 的数据成员放最前；有 invariant 时改用 `class`。
- `public:` 在前，`private:` 在后；`private:` 前空一行，数据成员之间不空行。
- 静态常量用 `static constexpr`；跨文件共享的常量放命名空间并 `inline constexpr`。
- 工厂放在构造函数之前；返回 `TaskTable` 的工厂用 `Create` 开头，名字说明创建的是什么状态。
- 用户声明的特殊成员函数集中放第 4 组；`= default` 也写出来，读者才知道是故意默认。
- 不要把数据成员插在函数之间；数据成员永远在最后一组。

### 其他函数的组内次序

Google、LLVM、OpenCV 都没有规定这一组内部的次序；本工作流补上：

- 开头是 `operator==`：成员默认比较和 `friend` 都放这里，然后才是谓词 `Is` / `Has` / `Can`、`Get`、普通函数按使用先后。`friend` 不再放到这一组末尾。
- 比较运算符的签名与 `[[nodiscard]]` 规则见 `references/types.md`，这里不另写一套。
- 同一类型上的谓词留在类内，不因为实现只转调公开函数就拆成类外自由函数。
- `friend` 类型仍跟其他类型放在一起，和 `friend` 函数不是同一组。

## 命名空间作用域的头文件

文件槽位与守卫名以 `references/file-template.md` 为准；本节只看命名空间作用域内的排列顺序。

```cpp
#ifndef TASKFLOW_INCLUDE_TASK_TABLE_H_
#define TASKFLOW_INCLUDE_TASK_TABLE_H_

#include <array>
#include <cstdint>
#include <string>

namespace taskflow {

inline constexpr int kTaskCount = 16;

enum class TaskState : std::uint8_t { kPending, kActive, kDone };

struct TaskRecord {
  int id = 0;
  TaskState state = TaskState::kPending;
};

[[nodiscard]] bool Contains(int id);
[[nodiscard]] std::string TaskStateToString(TaskState state);

class TaskTable {
 public:
  // 类内仍按上面的六组顺序
 private:
  std::array<TaskState, kTaskCount> tasks_{};
};

}  // namespace taskflow

#endif  // TASKFLOW_INCLUDE_TASK_TABLE_H_
```

顺序：包含 → 命名空间 → `inline constexpr` 常量 → `enum class` → `struct`（被依赖的在前）→ 自由函数 → 类。类的公共接口类型放在类内最前。

## `.cpp` 的定义顺序

- 与头文件声明同序：先类型和常量，再自由函数，再成员函数；成员函数按类内声明顺序。
- 文件头注释之后先放本文件的 `namespace taskflow {`，再放公共定义；常量仍排在具名命名空间内、成员函数之前；内部链接的写法按 `google-cpp-style.md`，本文不复述。
- 构造函数、析构函数、拷贝/移动定义放在成员函数组的最前；`= default` 的定义放 `.cpp` 时紧跟声明顺序。
- 不要为了「先编译」重排定义；C++ 不要求定义顺序，读者顺序优先。

## 空行

| 位置 | 空行 |
| --- | --- |
| 类内六个组之间 | 1 行 |
| 同组函数之间 | 1 行 |
| 数据成员之间 | 0 行 |
| `private:` 之前 | 1 行 |
| 命名空间内顶层实体之间 | 1 行 |
| 函数体内逻辑组之间 | 1 行，最多 1 行 |

连续两个空行视为格式缺陷；`clang-format` 的 `MaxEmptyLinesToKeep: 1` 会压掉，但不要依赖它。

### 函数体内的空行

- 以 `return` / `throw` 结束的 `if` 守卫，与下一组语句之间空 1 行。
- 同一组语句不拆：三个校验之后的赋值与 `return kSuccess` 之间不空行。
- 只有次序依赖的一对 `if`（`GetWinner`、`JudgeAfterPlace`）之间空 1 行。
- 最多 1 行，不连续空两行。
