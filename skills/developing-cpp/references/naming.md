# 命名

命名先回答「它是什么角色」，再选词。规则表是底线，语义角色表决定用哪个动词。

## 规则表

| 种类 | 规则 | 好 | 差 |
| --- | --- | --- | --- |
| 类型 / 类 / 结构 / 枚举 | PascalCase | `Inventory`, `Order`, `ItemState` | `inventory_t`, `order_result` |
| 函数 / 成员函数 | PascalCase | `IsInRange`, `GetItem` | `is_in_range`, `getitem` |
| 变量 / 参数 | snake_case | `slot_rows`, `order` | `SlotRows`, `o` |
| 类成员 | snake_case + `_` | `slots_`, `orders_` | `m_slots`, `slots` |
| 常量 / 枚举子 | `k` + PascalCase | `kSlotRows`, `Order::kDraft` | `SLOT_ROWS`, `Draft` |
| 命名空间 | snake_case | `inventory`, `warehouse` | `Inventory`, `Warehouse` |
| 宏 | 全大写 + 项目前缀，尽量不用 | `CPP_WORKFLOW_ASSERT` | `ASSERT` |

- 文件名用 snake_case：`order_result.h`、`inventory.cpp`；测试文件 `inventory_test.cpp`。
- 布尔变量用 `is_` / `has_` / `can_` 开头：`is_valid`、`has_stock`；不要用 `flag`、`status`。
- 容器用复数：`slots`、`orders`；单个元素用单数。
- 缩写按单词处理：`url`、`id`、`http`，不要写 `URL` 混进 snake_case；类型名里可以 `HttpClient`。
- 不要用单字母名，循环下标 `i` / `j` 除外；不要用 `data`、`info`、`tmp` 这类不说明内容的名字。

## 语义角色

| 角色 | 前缀 / 动词 | 例子 | 说明 |
| --- | --- | --- | --- |
| 查询 | `Get` | `GetCurrentOrder()` | 只读、不改变状态；返回成员时按 `const` 引用 |
| 判断 | `Is` / `Has` / `Can` | `IsInRange()`, `HasStock()` | 返回 `bool`，不抛异常 |
| 尝试 | `Try` | `TryReserve()` | 可能失败但不抛异常，返回结果类型 |
| 确定性动作 | 领域动词 | `PlaceItem()`, `Reset()` | 前置条件满足时一定成功；违反合同才抛 |
| 计算 | 动词开头 | `ScoreOrder()` | 从输入算出结果，不修改外部状态 |
| 映射 | `<来源>To<目标>` | `OrderToReceipt()` | 名字必须含两端角色 |
| 读写 | `Read` / `Write` | `ReadInventory()`, `WriteInventory()` | 涉及 I/O 时用；不要在库核心用 |
| 访问器 | `Get` + PascalCase | `GetHistory()` | 不用成员名直接当函数名 |

- 禁止裸 `To()` / `Of()`：调用点看不出方向。
- 禁止 `Set` + 成员名的伪访问器；需要修改时用领域动作（`PlaceItem` 而不是 `SetItem`）。
- `current_` 前缀只在有多个候选、且「当前」可能混淆时使用：`current_order_`。只有一个当前对象时不要加。

## 类型命名的判断顺序

1. 纯数据、无 invariant、可以直接聚合初始化 → `struct`，名字是名词：`Order`, `Position`。
2. 有 invariant、需要构造函数维持 → `class`，名字是名词：`Inventory`, `Warehouse`。
3. 封闭的状态集合 → `enum class`，名字是单数名词：`ItemState`, `OrderResult`；枚举子用 `k` 前缀。
4. 只有行为、没有状态，且调用方需要替换实现 → 抽象基类；只有一个实现时先用普通类。
5. 一组自由函数 → 命名空间 + 动词；不要为了「像 Java」造一个 `XxxUtil` 类。

## 改名

- 改名是一次独立改动：先搜全部调用点，再改声明、定义、测试和注释。
- 不要把改名和改行为混在一个提交里；改名后测试必须仍然绿色且行为句不变。
- 公共 API 改名视为破坏性变更；需要兼容时保留旧名转发，并在注释里写弃用期限。

## 术语

中文术语与英文标识符的对应见 `references/glossary.md`。代码标识符用英文；注释可以用中文，但同一个概念只用一种译法。
