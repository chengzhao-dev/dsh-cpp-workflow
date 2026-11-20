<!-- 读取时机：排声明顺序时；读完能回答：声明顺序与定义签名；预算：一次只开这一份（198 行），不自动串联。 -->
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
    [[nodiscard]] TaskState GetTaskState(int id) const;
    void SetTaskState(int id, TaskState state);
    [[nodiscard]] bool HasTask(int id) const;

    // 6. 数据成员
private:
    Tasks tasks_{};
    bool is_open_{false};
};
```

- `struct` 的数据成员紧跟类型之后；有 invariant 时改用 `class`。
- `public:` 在前，`private:` 在后；`private:` 前空一行，类的数据成员之间不空行，`struct` 的短字段可以空行分组（见 `references/comments/01-comment-rules.md`）。
- 静态常量用 `static constexpr`；跨文件共享的常量放命名空间并 `inline constexpr`。
- 工厂放在构造函数之前；返回 `TaskTable` 的工厂用 `Create` 开头，名字说明创建的是什么状态。
- 用户声明的特殊成员函数集中放第 4 组；`= default` 也写出来，读者才知道是故意默认。
- 不要把数据成员插在函数之间；数据成员放在最后一组，`struct` 是唯一例外（紧跟类型，见上）。

### 数据成员之间

- 数据成员按初始化依赖、逻辑分组和阅读顺序排列，不按字母序。初始化依赖是硬约束：先声明的成员先初始化，初始化器只能安全使用已经完成初始化的成员。
- 聚合类型的字段顺序参与聚合初始化与指定初始化器，也决定对象布局与 ABI；它不是 standard-layout 的成立条件。重排要同步所有 `T{a, b}` 调用点，并检查序列化或 ABI 假设。
- 先主值、后限定值，同类字段放一起。例如落子记录先放位置、再放玩家，读作「在哪、谁」。
- 互不依赖的成员按「读的时候先要哪样」排：`Game` 依次是 `current_player_`、`board_`、`history_`，读作「轮到谁、棋盘什么样、走过哪些手」；`board_` 是落子改动的主体，`history_` 是它的变更日志，所以排在最后。
- Google 的 Declaration Order 与 C++ Core Guidelines 的 NL.16 只规定访问级别和组间顺序，都没有字母序要求；沿用现有语义顺序即可。
- 团队若另定字母序，只作为语义相同时的最后兜底并写进项目规则，不和语义顺序混用。

### 其他函数的组内次序

Google、LLVM、OpenCV 都没有规定这一组内部的次序；本工作流补上：

- 有比较运算符时，开头是 `operator==`：成员默认比较和 `friend` 都放这里，然后按属性/概念分组：同一属性的 `Get`/`Set` 成对相邻，`Is` / `Has` / `Can` 放在这对之后；再放普通函数，按使用先后。不要把谓词插进 `Get`/`Set` 之间，也不要把全部谓词提前到全部 `Get` 之前。
- `Count` / `Size` 是集合摘要查询，放在该概念组的直接 `Get` 之前；它不属于 `Is` / `Has` / `Can` 谓词组，也不属于 `Set` / 修改器组。
- 不属于 `Is` / `Get` / `Set` 的流程函数按调用层次排：入口操作在前，它调用的显示 helper 紧随其后；`DisplayOptions`、`Note` 等共享 helper 放在调用它们的流程之后；终端进入、退出与清屏可集中在组首，按进入、退出、清屏排。
- `IsInRange` / `CheckInRange` 这类校验对不参与 `Get`/`Set` 分组，成对放在静态常量与构造函数之间，见下节「校验对的位置」；`CheckInRange` 是诊断函数，紧挨 `IsInRange` 写，见 `references/exceptions/01-exception-rules.md`。
- 没有 `Set` 配对时，谓词放在读取接口之后、修改接口之前。例：`CountOptions`、`GetOptions`、`GetCursorIndex` 之后是 `HasCursor`，再是 `MoveTo` / `MovePrevious` / `MoveNext`；这组接口可以放在 `private:`，组内次序不变。
- 多个直接返回成员的 `Get` 按对应数据成员的声明顺序排列，不按调用频率或字母序：成员依次是 `current_player_`、`board_`、`history_`，getter 就依次是 `GetCurrentPlayer()`、`GetBoard()`、`GetHistory()`；成员顺序调整时 getter 一起改，一个类里只留一套顺序。例外：`Count` / `Size` 是集合摘要，优先于该集合的直接 `Get`；其他没有独立成员的派生查询排在直接 `Get` 之后，按「先局部元素、后整体状态」阅读，不插进直接 `Get` 之间。例：`Game` 的 `GetResult()` 扫描棋盘后才得到结果，排在直接返回成员的 `GetCurrentPlayer()`、`GetBoard()`、`GetHistory()` 之后。
- 成对的局部/整体操作沿用同一方向：先 `ClearSquare(position)` 清一格，再 `Clear()` 清整盘；局部操作在前，整体操作在后，不按调用频率互换。
- `constexpr` / `consteval` 函数不单独提前：它们属于「其他函数」组，按上面的语义次序排。`constexpr` 与 `consteval` 隐含 `inline`，这才使头文件就地定义可行；它们不决定声明位置；就地定义的短函数也留在该组，不因为写在头文件里就挪到类的最前。
- 比较运算符的签名与 `[[nodiscard]]` 规则见 `references/language/value-types/08-comparison.md`，这里不另写一套。
- 同一类型上的谓词留在类内，不因为实现只转调公开函数就拆成类外自由函数。
- `friend` 类型仍跟其他类型放在一起，和 `friend` 函数不是同一组。

### 校验对的位置

坐标、下标、句柄这类输入合法性判断由一对函数承载：`Is*` 回答「在不在范围内」，`Check*` 在越界时抛出。这一对放在静态常量（第 2 组）与工厂（第 3 组）之后、构造/赋值/析构（第 4 组）之前；没有工厂时紧跟静态常量。

```cpp
class Board {
public:
    static constexpr std::size_t kRows = 3;
    static constexpr std::size_t kColumns = kRows;

    [[nodiscard]] static bool IsInRange(const Position& position) noexcept;
    static void CheckInRange(const Position& position);

    Board() = default;

    [[nodiscard]] SquareValue GetSquareValue(const Position& position) const;
    void SetSquareValue(const Position& position, SquareValue value);
    [[nodiscard]] bool IsSquareEmpty(const Position& position) const;
```

- 读者从上往下读到的是「常量 → 契约 → 生命周期 → 操作」：默认构造函数之前，棋盘有多宽、坐标怎样算合法已经说过一遍；`GetSquareValue` / `SetSquareValue` / `IsSquareEmpty` 的 `@throws std::out_of_range` 也不再是突然出现的新信息。
- 条件：成对出现、都是 `static`、命名为 `Is*` 与 `Check*`，只做「合法吗」与「不合法就抛」；夹带业务判断的函数不适用。同一个工程里所有类的校验对放同一个位置，不一处前置、一处留在第 5 组。
- 这是本工作流对 Google 与 NL.16 的**显式偏离**：两者都把 `static` 成员函数归入「其他函数」，排在构造函数之后。偏离只限这一对，其他 `static` 函数仍留在第 5 组；代价是审查者要认这条本地规则。
- `.cpp` 的定义同样前置，与头文件同序；`GetSquareValue` / `SetSquareValue` / `IsSquareEmpty` 里的 `CheckInRange(position);` 出现在定义之后，C++ 允许先调用后定义。
- `header-order` 只检查非 `static` 的 `Is` / `Has` / `Can` / `Completes` / `Would` 谓词，`Check*` 也不在谓词表内，所以这个位置没有 rule 兜底，靠人工核对。

## 命名空间作用域的头文件

文件槽位与 `#pragma once` 的写法以 `references/layout/02-file-template.md` 为准；本节只看命名空间作用域内的排列顺序。

```cpp
#pragma once

#include <array>
#include <cstdint>
#include <string>

namespace taskflow {

inline constexpr int kTaskCount = 16;

enum class TaskState : std::uint8_t { kPending, kActive, kDone };

struct TaskRecord {
    int id{0};
    TaskState state{TaskState::kPending};
};

[[nodiscard]] bool HasTask(int id);
[[nodiscard]] std::string TaskStateToString(TaskState state);

class TaskTable {
public:
    // 类内仍按上面的六组顺序
private:
    std::array<TaskState, kTaskCount> tasks_{};
};

}  // namespace taskflow
```

顺序：包含 → 命名空间 → `inline constexpr` 常量 → `enum class` → `struct`（被依赖的在前）→ 自由函数 → 类。类的公共接口类型放在类内最前。

## `.cpp` 的定义顺序

- 本工作流约定：与头文件声明同序，先类型和常量，再自由函数，再成员函数；成员函数按类内声明顺序。Google、LLVM 与 C++ Core Guidelines 都没有规定 `.cpp` 成员定义的次序；这里选同序，是为了让读者能在头文件与实现之间逐项对照。
- 文件头注释之后先放本文件的 `namespace taskflow {`，再放公共定义；常量仍排在具名命名空间内、成员函数之前；内部链接的写法按 `references/style/01-google-cpp-style.md`，本文不复述。
- 构造函数、析构函数、拷贝/移动定义通常放在成员函数组最前；如果头文件把某个成员声明在构造函数之前，仍按头文件声明顺序，不把构造函数硬提到前面。校验对就是这种情况：`IsInRange`、`CheckInRange` 定义在 `GetSquareValue` 之前，跟头文件一致。`= default` 的定义放 `.cpp` 时紧跟声明顺序。
- 不要为了「先编译」重排定义；C++ 不要求定义顺序，读者顺序优先。

## 声明与定义的签名

`.cpp` 的定义必须复写头文件声明的参数类型、`const` / `volatile` / `noexcept`、引用限定符 `&` / `&&` 与返回类型；参数名可以不同，默认实参只写在声明处。构造函数改参数时，成员初始化列表与初始化顺序一起改。

- 改签名、返回类型或限定符是破坏性变更：同一轮改声明、定义、初始化列表和所有调用点，不先让编译失败再追着修。
- 类内没有声明的成员定义报 `definition-undeclared`；参数类型、限定符或返回类型不一致报 `definition-signature`。模板与无法解析的声明按保守规则跳过；`auto` 返回类型不比较具体类型。
- 检查器检查配对头文件里的类：类成员的声明顺序与 `.cpp` 定义签名；自由函数、匿名命名空间与没有配对头文件的 `.cpp` 不在覆盖内，它们靠人工核对。

### 检查器覆盖

`checking-declaration-order.mjs` 对配对头文件里的类报告这些 rule：

| rule | 报什么 |
| --- | --- |
| `definition-undeclared` | `.cpp` 里定义了类内没有声明的成员 |
| `definition-signature` | 定义的参数类型、`const`/`volatile`/`noexcept`、引用限定符或返回类型与声明不一致 |
| `definition-order` | 成员定义顺序与头文件声明顺序不同 |
| `header-order` | 谓词排在读取接口之前、Get/Set 之间或修改接口之后；`static` 谓词与 `Check*` 不检查 |
| `header-ambiguous` | 同名头文件不唯一，无法配对 |

其余顺序规则——六个分组的先后、校验对的位置、空行、访问说明符位置、`= default` 的位置——没有 rule，靠人工核对。

## 空行

| 位置 | 空行 |
| --- | --- |
| 类内六个组之间 | 1 行 |
| 同组函数之间 | 1 行 |
| 类的数据成员之间；`struct` 的短字段可以空行分组 | 0 行 |
| `private:` 之前 | 1 行 |
| 命名空间内顶层实体之间 | 1 行 |
| 函数体内逻辑组之间 | 1 行，最多 1 行 |

连续两个空行视为格式缺陷；`clang-format` 的 `MaxEmptyLinesToKeep: 1` 会压掉，但不要依赖它。

### 函数体内的空行

- 每个以 `return` / `throw` 结束的守卫各自成组，守卫组之间空 1 行；同一次检查拆成取值、判断与返回多条语句时组内不空行；守卫组与后续处理之间空 1 行。
- 取回一个结果并按结果分支的语句连成一组（声明、`if`、`throw` / `return`），组内不空行；这一组与收尾（记录这一步、轮到对方、返回成功）之间空 1 行。
- 同一组语句不拆：三个校验之后的赋值与 `return` 之间不空行。
- 只有次序依赖的一对 `if`（`GetWinner`、`JudgeAfterPlace`）之间空 1 行。
- 互斥策略组与组之间空 1 行；`std::unreachable()` 紧跟 `switch` 的右花括号，中间不空行。位置理由不在这里重复。
- 循环结束后还有 `return` 时，循环与 `return` 之间空 1 行。
- 最多 1 行，不连续空两行。

### 头文件里的空行

- 类内六个组之间、同组函数之间、命名空间内顶层实体之间各空 1 行。
- 类的数据成员之间不空行，`struct` 的短字段可以空行分组；`private:` 之前空 1 行。
- 注释与声明之间不留空行，写法见 `references/comments/02-style.md`。
- Doxygen 列表项之间不插空注释行。

## 依据

- [Google C++ Style Guide: Declaration Order](https://google.github.io/styleguide/cppguide.html#Declaration_Order)：类内先 public、再 protected、最后 private；同节内类型、常量、函数、数据成员的先后。
- [Google C++ Style Guide: Vertical Whitespace](https://google.github.io/styleguide/cppguide.html#Vertical_Whitespace)：垂直留白越少越好；空行用来分隔逻辑分组，函数体首尾不留空行，函数体内不随意加空行。
- [C++ Core Guidelines: NL.16](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rl-order)：类型、构造/赋值/析构、函数、数据成员的传统次序。
- [cppreference: 构造函数](https://en.cppreference.com/w/cpp/language/constructor)：非静态数据成员按声明顺序初始化，与 mem-initializer 列表顺序无关。
- [LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html)：只要求每个 `.cpp` 先包含定义其接口的头文件，没有规定成员定义的先后；上一条「与头文件声明同序」因此是本工作流约定，不冒充外部标准。
- 本工作流在「校验对的位置」上偏离第一条与第三条：把 `static` 的 `Is*` / `Check*` 校验对提到构造函数之前，其余 `static` 函数仍按上两条放在构造函数之后；偏离理由与边界见该节。
