# 正反例：注释

## 文件头

**差**：

```cpp
// task_list.cpp
// 作者：张三
// 创建：2024-01-01
// 修改：2024-02-01 修复 bug
```

**好**：

```cpp
//===----------------------------------------------------------------------===//
// TaskList 的存储、优先级排序与稳定顺序。
//
// 不处理终端输入输出；程序层负责解析「优先级 名称」并打印。
//===----------------------------------------------------------------------===//
```

文件头回答「这个文件负责什么、不负责什么」，不写作者和变更史。

## 声明注释

**差**：

```cpp
/// 获取任务。
/// @param index 索引
/// @return 任务
Task GetTask(int index) const;
```

问题：没说越界行为，没说返回的是拷贝还是引用。

**好**：

```cpp
/// 返回 index 处的任务副本。
///
/// @param index 任务下标，必须在 [0, tasks_.size()) 内
/// @return 该位置的任务
/// @throws std::out_of_range index 越界
[[nodiscard]] Task GetTask(int index) const;
```

契约完整：范围、返回、异常。

## 实现注释

**差**：

```cpp
// 如果 tasks_ 为空
if (tasks_.empty()) {
  // 返回空
  return {};
}
// 遍历 tasks_
for (const auto& task : tasks_) {
  // 比较优先级
  if (task.priority < best.priority) {
    // 更新 best
    best = task;
  }
}
```

每行都在复述代码。

**好**：

```cpp
// 空列表是合法状态，调用方不应被迫先判空。
if (tasks_.empty()) {
  return {};
}

// 优先级相同时保留先加入的任务：用严格小于，不交换等值元素。
for (const auto& task : tasks_) {
  if (task.priority < best.priority) {
    best = task;
  }
}
```

解释「为什么」和「稳定排序的取舍」，不翻译语句。

## TODO

**差**：

```cpp
// TODO: 参考 xxx
// FIXME: 这里可能有问题
// TODO(张三): 优化
```

**好**：

```cpp
// TODO: 阶段 2 - 支持按截止日期排序
// TODO: issue #42 - 把优先级解析抽成 TryParsePriority
```

有定位、有动作、能搜索。

## 配置注释

**差**：

```yaml
# 这是 clang-format 配置
# 详见某文档
ColumnLimit: 100
```

**好**：

```yaml
# 100 列：模板和格式化串在 80 列下换行过碎。
ColumnLimit: 100
```

解释取值理由，不写策略头，不指文档路径。

## 横幅

**差**：

```cpp
// ===== 函数 =====
void AddTask();
void RemoveTask();
// ===== 结束 =====
```

**好**：

```cpp
//===----------------------------------------------------------------------===//
// 查询
//===----------------------------------------------------------------------===//

[[nodiscard]] std::size_t Size() const;
[[nodiscard]] bool IsEmpty() const;
```

横幅是跳转锚点，不是装饰；一组函数一个横幅，单函数不加。

## 枚举行尾注释

**差**：

```cpp
enum class Status : std::uint8_t {
  kInProgress,  // 进行中
  kDraw,        // 平局
  kXWins,       // X 获胜
  kOWins        // O 获胜
};
```

问题：四个成员都写等于没写，且把名字重复了一遍。

**好**：

```cpp
enum class Status : std::uint8_t {
  kInProgress,  ///< 对局继续，尚未判定结果
  kDraw,        ///< 平局
  kXWins,       ///< X 获胜
  kOWins        ///< O 获胜
};
```

若只有部分成员需要解释，同一枚举内要写就写全，或全不写；不要半套。语义结果写在最前，判定条件放冒号后。

## 声明注释的完整契约

**差**：

```cpp
/// 放置棋子。
/// @param row 行
/// @param col 列
void Place(int row, int col, Mark mark);
```

**好**：

```cpp
/// 在 (row, col) 放置当前玩家的棋子。
///
/// @param row 行下标，必须在 [0, rows) 内
/// @param col 列下标，必须在 [0, cols) 内
/// @param mark 要放置的棋子，不能是 kEmpty
/// @throws std::out_of_range 坐标越界
/// @throws std::invalid_argument mark 为 kEmpty，或该位置已有棋子
void Place(std::int32_t row, std::int32_t col, Mark mark);
```

只写调用者无法从签名推出来的内容：范围、所有权、失败方式。`@brief` 不写，第一行就是摘要。

## 相邻注释

**差**：

```cpp
// 这里先检查边界
// 然后检查占用
// 最后写入
if (!InRange(row, col)) return false;
if (cells_[Index(row, col)] != Mark::kEmpty) return false;
cells_[Index(row, col)] = mark;
return true;
```

**好**：

```cpp
// 先检查再写入：失败时不留下半完成状态。
if (!InRange(row, col)) return false;
if (cells_[Index(row, col)] != Mark::kEmpty) return false;
cells_[Index(row, col)] = mark;
return true;
```

一段连续的实现注释只讲一个判断或一个取舍；不是逐行字幕。
