# 命名

命名先回答「它是什么角色」，再选词。规则表是底线，语义角色表决定用哪个动词。

## 规则表

| 种类 | 规则 | 好 | 差 |
| --- | --- | --- | --- |
| 类型 / 类 / 结构 / 枚举 | PascalCase | `TaskTable`, `Order`, `TaskState` | `task_table_t`, `order_result` |
| 函数 / 成员函数 | PascalCase | `Contains`, `GetTaskState` | `contains`, `gettaskstate` |
| 变量 / 参数 | snake_case | `task_count`, `order` | `TaskCount`, `o` |
| 类成员 | snake_case + `_` | `tasks_`, `orders_` | `m_tasks`, `tasks` |
| 结构体成员 | snake_case，无尾随 `_` | `name`, `priority` | `name_`, `priority_` |
| 常量 / 枚举子 | `k` + PascalCase | `kTaskCount`, `Order::kDraft` | `TASK_COUNT`, `Draft` |
| 命名空间 | snake_case | `taskflow`, `warehouse` | `Taskflow`, `Warehouse` |
| 宏 | 全大写 + 项目前缀，尽量不用 | `CPP_WORKFLOW_ASSERT` | `ASSERT` |

- 文件名用 snake_case：`order_result.h`、`task_table.cpp`；测试文件 `task_table_test.cpp`。
- 布尔变量用 `is_` / `has_` / `can_` 开头：`is_valid`、`has_stock`；不要用 `flag`、`status`。
- 容器用复数：`tasks`、`orders`；单个元素用单数。
- 缩写按单词处理：`url`、`id`、`http`，不要写 `URL` 混进 snake_case；类型名里可以 `HttpClient`。
- 不用单字母名：坐标用 `position`，行、列用 `row`、`col`；`i` / `j` 只用于没有领域名字的计数（如遍历固定长度的下标）。也不要用 `data`、`info`、`tmp` 这类不说明内容的名字。

## 语义角色

| 角色 | 前缀 / 动词 | 例子 | 说明 |
| --- | --- | --- | --- |
| 查询 | `Get` 或访问器风格 | `GetCurrentOrder()`、`CurrentOrder()` | 只读、不改变状态；同一 API 选一种 |
| 判断 | `Is` / `Has` / `Can` | `IsEmpty()`、`HasStock()`、`HasLine()` | 返回 `bool`，不抛异常 |
| 查找 | `Find` | `FindTask()` | 找不到是正常结果，返回 `optional` 或迭代器，不抛 |
| 计数 | `Count` | `CountPendingTasks()` | 返回数量，不修改状态 |
| 尝试 | `Try` / 领域动词 | `TryReserve()`、`PlaceCell()` | 可能因多个前置条件失败但不抛异常，返回 `enum class` 结果；调用方按名区分失败原因 |
| 确定性动作 | 领域动词 | `CompleteTask()`, `Reset()` | 前置条件满足时一定成功；无法完成任务时抛 |
| 计算 | 动词开头 | `ScoreOrder()` | 从输入算出结果，不修改外部状态 |
| 映射 | `<来源>To<目标>` | `OrderToReceipt()` | 名字必须含两端角色 |
| 读写 | `Read` / `Write` | `ReadTaskTable()`, `WriteTaskTable()` | 涉及 I/O 时用；不要在库核心用 |
| 访问器 | `Get` + PascalCase，或 snake_case | `GetHistory()`、`history()` | Google 允许两种；同一 API 只选一种，不用成员名直接当函数名 |

- 返回 `bool` 的 lambda 也用 `is_` / `has_` / `can_` 命名：`auto is_empty = [](const Order& order) { ... };`。
- `Find` 不把“没找到”当异常；`Get` 在前置条件不满足时抛标准异常：坐标越界用 `std::out_of_range`，调用时不变量已破坏用 `std::logic_error`；只有调用方必须把这些类型区分开时，才新增派生自它们的类型。两种构建模式的抛出条件相同。两者不要互换。
- 查询返回多个值时用 `struct`，不要用三个 `GetXxx()` 加输出参数。

- 禁止裸 `To()` / `Of()`：调用点看不出方向。
- 修改器用 `Set` + 属性名（`SetCount()` / `set_count()`）或领域动作（`CompleteTask()`）；同一 API 只选一种，不要用 `SetItem` 这类暴露存储细节的名字。
- `current_` 前缀只在有多个候选、且「当前」可能混淆时使用：`current_order_`。只有一个当前对象时不要加。

## 谓词与查询命名

- 返回 `bool` 的查询用肯定式，读起来像一句断言：`IsEmpty()`、`HasStock()`、`CanReserve()`、`HasLine()`。
- 前缀集就是这四类：`Is` / `Has` / `Can`，外加与成对规则一一对应的 `Completes`、`Would` 这类限定式；`Contains` 只保留给容器成员（`std::vector::empty` 一类已有标准名），不拿它当一般谓词。
- `Get` 只用于取值，`Set` 只用于设值；不要用 `CheckLine()` 当布尔 getter。
- `Check` / `Validate` 留给会报告错误、产生诊断或可能失败的操作；它们不返回纯 `bool` 查询。
- 动作可能因为多个前置条件失败、而调用方需要区分原因时，返回 `enum class`（`PlaceCellResult`、`WinPreviewResult`），不要用 `bool` 加输出参数，也不要拆成一串 `IsXxx` 判断再重复检查。
- 假设性查询在名字里写明条件：`PreviewWin(position, cell)` 读作「这一手会成线吗」，返回 `WinPreviewResult` 区分「不能落子」与「能落但不赢」；只有成功与不报错的纯判断才用 `bool`。同一 API 只选一种，改名时同步声明、定义、调用点、测试和注释。
- 私有谓词同样用肯定式；不要用 `flag`、`status` 或 `check` 这类不说明判据的名字。

## 类型命名的判断顺序

1. 纯数据、无 invariant、可以直接聚合初始化 → `struct`，名字是名词：`Order`, `TaskRecord`。
2. 有 invariant、需要构造函数维持 → `class`，名字是名词：`TaskTable`, `Warehouse`。
3. 封闭的状态集合 → `enum class`，名字是单数名词：`TaskState`, `OrderResult`；枚举子用 `k` 前缀。
4. 只有行为、没有状态，且调用方需要替换实现 → 抽象基类；只有一个实现时先用普通类。
5. 一组自由函数 → 命名空间 + 动词；不要为了「像 Java」造一个 `XxxUtil` 类。

## 改名

- 改名是一次独立改动：先搜全部调用点，再改声明、定义、测试和注释。
- 不要把改名和改行为混在一个提交里；改名后测试必须仍然绿色且行为句不变。
- 公共 API 改名视为破坏性变更；需要兼容时保留旧名转发，并在注释里写弃用期限。

## 术语

中文术语与英文标识符的对应见 `references/glossary.md`。代码标识符用英文；注释可以用中文，但同一个概念只用一种译法。
