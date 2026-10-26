# 类型、数值与值语义

类型不是存储格式的同义词。先写清一个值允许什么、禁止什么，再选 `int`、`std::int32_t`、`enum class` 还是包装类型。

## 宽度、范围与 `std::size_t`

- C++ 只保证基础整数类型的最小范围，不保证 `int` 固定 32 位，也不保证 `long` 一定宽于 `int`。
- `sizeof(T)` 返回 `std::size_t`；`<limits>` 的 `std::numeric_limits<T>` 查询最大值、最小值和特殊值。
- 协议、文件格式或跨平台布局要求固定宽度时，用 `<cstdint>` 的 `std::int32_t`、`std::uint64_t`，并确认目标平台提供该类型。
- `char` 是否有符号由实现决定；存字符时不要把它当成固定范围的小整数。
- 整数字面量的类型由后缀和候选类型决定；宽度或符号属于接口时，写出目标类型并检查转换。

`std::size_t` 是无符号类型，适合对象大小和容器下标。把它和负的 `int` 比较会先转成无符号，结果与直觉相反。统一下标类型，或先验证非负再比较。

## 有符号、无符号与溢出

- 普通整数类型默认有符号；只有确有非负语义且理解边界时才用无符号。
- 无符号运算按模 `2^N` 回绕，这是有定义的行为；有符号整数溢出是未定义行为。
- 数组越界、空指针解引用、读取未初始化变量都属于未定义行为。编译器可以假设它们不发生，优化后的结果可能完全不符合直觉。
- 两边都是整数时，`/` 向零截断，`%` 给余数；`7 / 2` 是 `3`。整数除以零是未定义行为，不能与浮点的 `inf` / `nan` 混为一谈。
- 浮点转整数会截断小数；大整数转小整数可能丢高位或改变符号。先检查范围，再 `static_cast`。
- 禁止 C 风格强转 `(int)value`；它隐藏转换类别，`google-readability-casting` 会报。

```cpp
int CountWide(const std::vector<int>& values) {
  int count = 0;
  for (std::size_t index = 0; index < values.size(); ++index) {
    if (values[index] > 0) ++count;
  }
  return count;
}
```

循环下标与容器大小都用 `std::size_t`，避免混合比较。业务编号另按下面的定宽约定。

## 项目对整型角色的约定

| 角色 | 类型 | 理由 |
| --- | --- | --- |
| 业务编号、尺寸、参与边界判定的下标 | `std::int32_t` | 能表达负值，避开 `size_t` 与负数比较的陷阱 |
| 容器长度、`std::array` 长度、由编号换算的索引 | `std::size_t` | 与 STL 和 NTTP 一致 |
| 封闭状态码的底层类型 | `std::uint8_t` | 只表达取值集合和布局，不参与算术 |

- 不用裸 `int` 承担跨平台协议或布局；它的宽度不可预测。
- 不用 `std::uint8_t` / `std::uint16_t` 当业务编号；负值无法表达，整数提升还会制造意外。
- 有符号乘法进入容器长度前先显式拓宽，否则会触发 `bugprone-implicit-widening-of-multiplication-result`：

```cpp
inline constexpr std::int32_t kBatchSize = 3;
inline constexpr std::int32_t kItemsPerBatch = 3;
inline constexpr std::size_t kItemCount =
    static_cast<std::size_t>(kBatchSize) * static_cast<std::size_t>(kItemsPerBatch);
std::array<TaskState, kItemCount> items_{};
```

- 下标换算在同一函数里先 `static_cast<std::size_t>` 各操作数再乘加；不要为此关闭检查，也不要改业务编号的类型。

## 枚举类

`enum class` 定义封闭取值集合：

- 枚举值只在类型作用域内可见：`TaskState::kPending`，不写 `kPending`。
- 与整数之间不发生隐式转换；需要编号时写 `static_cast<int>(state)`，只用于输出或既有接口。
- 同类型值可以比较和赋值；不能参与算术。
- 需要固定布局时写底层类型：`enum class TaskState : std::uint8_t { kPending, kActive, kDone };`

约定：

- 新代码用 `enum class`；unscoped `enum` 只用于兼容 C 接口，不作为默认写法。
- 封闭状态码默认写 `: std::uint8_t`；普通枚举用默认底层类型。
- 枚举值的行尾注释要么全写要么全不写；语义结果写在最前，`///<` 对齐。
- 需要“编号”与“名字”两套表示时，写显式映射函数，例如 `TaskStateToName` / `TaskStateFromName`，不要在枚举和整数之间来回隐式转换。

## 强类型包装

同一底层类型承载不同领域含义时，轻量包装能把“不该混用”变成编译错误：

```cpp
struct Meters {
  double value{0.0};
};

struct Seconds {
  double value{0.0};
};
```

- 包装是聚合，成员公开，仍可构造不合理值；需要不变量时改用 `class` 并在构造函数检查。
- 取值封闭的领域值用 `enum class`，不要为了“强类型”再包一层。
- 包装的代价是取值要写 `.value`；只在确实存在混用风险时使用，不为每个 `int` 造类型。

## 成员函数尾部的 `const`

```cpp
class TaskBoard {
 public:
  [[nodiscard]] TaskState GetTaskState(TaskId id) const;
  void SetTaskState(TaskId id, TaskState state);

 private:
  std::array<TaskState, kTaskCount> tasks_{};
};
```

- 尾部 `const` 承诺不修改实例自身；与参数上的 `const`、返回类型上的 `const`、局部变量的 `const` 各管一段。
- 查询型成员一律标尾部 `const`；修改型成员不标，误标会被编译器拒绝。
- 返回成员容器的只读视图时，返回 `const` 引用或按值返回；不要返回可变内部引用。
- `mutable` 只用于缓存、互斥量等“逻辑 const”场景，并在注释里写理由；不要用它绕过正常的 const 设计。

## `[[nodiscard]]`

- 只给“结果携带信息、忽略会出错”的函数：查询型 `const` 成员与返回结果对象的 API。
- 不给所有非 `void` 函数机械添加；标注的价值来自稀缺。
- 有意丢弃时写 `static_cast<void>(result)`，不要为此全局关闭警告。
- 测试里验证“必须处理结果”时，同时验证忽略能被编译器发现。

## 下标与 `at`

同一容器上，`operator[]` 与 `at` 的失败方式不同：

| 族 | 容器 | `[]` 越界 | `at` 越界 |
| --- | --- | --- | --- |
| 按下标 | `array`、`vector`、`deque`、`string`、`string_view` | 未定义行为 | 抛 `std::out_of_range` |
| 按键 | `map`、`unordered_map` | 缺键则插入默认值 | 缺键则抛 `std::out_of_range` |
| 无下标 | `set`、`unordered_set`、`multimap` | 无 `operator[]` / `at` | — |

- 只在调用点已经证明下标合法时用 `[]`；否则用 `at` 或先做边界检查。坐标类型不拥有容器区间；区间判断属于持有尺寸的类型（如 `Board::IsInRange`）。`std::span` 在 C++20 没有 `at`，`span::at` 到 C++26 才进入标准。
- `map::operator[]` 会插入，不是“读取可能缺失的键”；只读查询用 `find` / `contains` / `at`。
- 契约失败的消息用 `std::format`，见 `references/exceptions.md`。

## 浮点与布尔

- 二进制浮点通常不能精确表示十进制小数，`0.1 + 0.2` 不要直接与 `0.3` 用 `==` 比较。
- 比较计算结果时使用与量纲、误差预算匹配的容差；单独处理 `NaN` 与无穷大。
- 金额存最小货币单位的整数（如“分”）；折扣率、比例、物理量可用 `double`，但要写清精度边界。
- 整数 `0` 转 `false`，非 `0` 转 `true`；流默认输出 `0` / `1`，需要可读文本时先写 `std::boolalpha`。
- 不要把 `bool` 当成承载多个状态的整数；互斥状态用 `enum class`。

## 检查清单

- [ ] 参与协议、布局或跨平台边界的整数有明确宽度。
- [ ] 业务编号与容器下标没有混用有符号和无符号。
- [ ] 封闭状态集合用 `enum class`，没有裸整数状态码。
- [ ] 查询成员标了尾部 `const`；`[[nodiscard]]` 只出现在结果型 API。
- [ ] 下标访问前有边界证明，或使用 `at`。
- [ ] 浮点比较有容差，金额没有用 `double` 结算。
