# 异常与错误

本文件是**开发阶段**的源码写作指导，只在 `developing-cpp` 被打开时阅读。插件运行时不编译 C++、不执行示例，也不把这里的规定送进任何运行时流程；它只是一份随技能分发的 Markdown 参考。

Google C++ Style Guide 明确写「We do not use C++ exceptions」。本工作流在书面规范上做一次有边界、可追溯的偏离：**源码示例和异常指导采用 C++ Core Guidelines 的 Error handling 规则**，因为这套规则由 Bjarne Stroustrup 与 Herb Sutter 编辑，代表现代 C++ 社区对异常安全、RAII 和 invariant 的共识。偏离只覆盖异常这一节；其他排版、命名、类型和注释规则仍以 Google 为准。不要在工程里同时引入 LLVM、Chromium 或 Abseil 的异常政策作为第二套标准。

规范来源：

- [C++ Core Guidelines: Error handling](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-errors)（E.1–E.31）。
- [Boost.Exception](https://www.boost.org/doc/libs/latest/libs/exception/doc/boost-exception.html)：异常类型层级的工程典范，只借它的结构，不把 Boost 变成依赖。

## 先定错误策略

E.1 要求尽早决定错误处理策略。写接口前先回答：

- 这个函数不能完成自己的任务时，调用方还能继续吗？
- 失败是「正常的另一种结果」，还是「invariant 被破坏、继续执行没有意义」？
- 失败信息需要跨层携带，还是只需在边界打印？

策略一旦定下，声明、实现、测试和入口都用同一套；不要在同一层里一半返回错误码、一半抛异常。

## 什么时候抛

E.2：函数不能完成它被分配的任务时，就抛异常；构造函数无法建立 invariant 时也抛，而不是留下半初始化对象。E.3：异常只用于错误处理，不能拿 `throw` 当返回值或正常分支。E.4：错误处理围绕 invariant 设计，而不是围绕「哪一行可能失败」。E.5：构造函数负责建立 invariant，失败就抛。E.6：用 RAII 防止泄漏，优先局部对象而不是裸 `new`。

判断句可以写成：**调用方是否还能履行自己的合同？** 不能，就让异常向上传播；能，并且失败是接口的正常结果，就用返回值、`std::optional` 或项目自己的结果类型表达。不要为了「统一」把可恢复的业务分支包成异常，也不要把已经无法维持 invariant 的状态压成错误码继续跑。

## 异常类型

E.14：用专门的用户定义类型表示异常，不要抛内建类型、`std::string` 或字符串字面量。类型本身可以只表达语义，数据放在成员里；也可以完全不带数据，让 `catch` 只按类型选择。

```cpp
// 领域错误：类型即语义，调用方可以只捕获自己认识的那一支。
class ParseError : public std::runtime_error {
 public:
  explicit ParseError(const std::string& message) : std::runtime_error(message) {}
};
```

标准库已经命名的失败直接用标准类型：坐标越界用 `std::out_of_range`，调用时不变量已破坏用 `std::logic_error`，正常输入里的解析失败可以用 `std::runtime_error`。只有调用方必须把这些失败和上述类型区分开时，才新增派生自它们的类型；不要为了「看起来规范」给每个参数错误都建一支。项目若定义自己的异常基类（如 `Error`），先定基类再按领域派生，调用方捕获基类就能接住整族异常。

## 两种构建模式的三层合同

库的失败方式在 Debug 与 Release 下必须可预测；只有诊断信息的详略可以不同。

- 返回值：两种模式完全一致。函数用返回值报告可恢复失败时，Debug 不得改成抛异常，Release 也不得把异常改成 false。
- 标准异常：两种模式的抛出条件相同。越界抛 `std::out_of_range`，前置条件被破坏抛 `std::logic_error`；项目若定义 `Error` 基类，派生类型同时派生自 `std::exception`，Debug 的 `what()` 可带 `file:line`，Release 只留值。
- `Check`：项目保留这种断言时，两种模式都检查，失败时打印诊断并终止；用于 invariant 已被破坏、继续执行没有意义的场合。没有 `Check` 的项目直接用 `assert` 或 `std::terminate` 表达同一边界，不另写包装。
- `DebugCheck`：项目保留时只在 Debug 生效，`NDEBUG` 后展开为空；用于代价高、只在开发期值得做的自检。不得用它承担 Release 也必须执行的检查。

`Check` 不是 `[[noreturn]]`：条件成立时正常返回。`DebugCheck` 的参数在 Release 不求值，不能放入有副作用的表达式。

## 抛出与捕获

E.15：按值抛出、按引用捕获（通常是 `const` 引用）；不要抛裸指针；重新抛出用 `throw;`，不要 `throw error;` 丢类型。

```cpp
try {
  ReadConfig(path);
} catch (const FileReadError& error) {
  // 能补偿才捕获；不能补偿就让异常继续向上。
  throw;
}
```

E.17：不要在每个函数里捕获所有异常。E.18：少用显式 `try/catch`，优先 RAII 和 `finally` 风格的清理对象。E.19：没有资源句柄时，用 `final_action` 之类的 scope guard 做清理。

E.31：`catch` 子句从派生到基类、从具体到通用排序，`catch (...)` 只能放最后。不要 `catch (...)` 后静默返回，除非当前层真的能把错误翻译成调用方合同的一部分。

## 不抛的边界

E.12：在不可能或不可接受抛异常的地方用 `noexcept`。声明前先读实现：函数体里出现 `at()` 或其他可能抛出的调用，就去掉 `noexcept`。正例是只比较两个整数的 `IsInRange`；反例是用 `at()` 写入并可能抛 `std::out_of_range` 的 `PlaceCell`。E.13：直接拥有资源的函数不要抛，资源释放应交给 RAII。E.16：析构、`deallocate`、`swap` 以及异常类型的拷贝/移动构造不得失败；析构和 `swap` 应当是 `noexcept`。

E.30：不要写异常规范（`throw(...)` 之类）；C++11 之后用 `noexcept` 表达「不抛」。需要无异常构建时，由项目单独决定，不要把这套异常指导改写成两面都对的模糊话。

## 程序入口

库让异常向上传播，入口是翻译边界：捕获 `std::exception`，输出可理解的诊断，返回项目约定的非零退出码。退出码的具体取值属于项目合同，本节不规定 0/1/2。

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

消息要能让调用者定位操作和关键值；不强制固定消息模板，也不要求库代码打印日志。`std::format` 只是构造 `what()` 或边界消息的一种方式。C++20 及更早没有 `std::print`；默认 C++23 且标准库支持时，可在程序边界用 `std::print`，库代码仍只组合消息、不直接打印。

## 声明注释

在公共声明的注释里写清：什么条件下抛、抛哪一类、调用方如何避免。实现文件里的内部异常不必逐条写进公共头。

```cpp
/// 读取配置文件。
/// @throws FileReadError 文件不存在或无法读取。
/// @throws ParseError 内容不是合法配置。
Config ReadConfig(const std::filesystem::path& path);
```

## 检查清单

- [ ] 错误策略在接口设计时已确定，同一层没有混用错误码和异常。
- [ ] 构造函数失败时抛异常，没有留下半初始化对象。
- [ ] 异常类型有语义，没有抛内建类型、字符串或裸指针。
- [ ] 按值抛出、按 `const` 引用捕获；重抛用 `throw;`。
- [ ] 析构、`swap`、异常类型的拷贝/移动不抛。
- [ ] 没有用异常做正常分支，也没有在每个函数里捕获所有异常。
- [ ] 入口有统一捕获，消息可定位，退出码符合项目合同。
- [ ] 公共声明的 `@throws` 与实际抛出类型一致，且 Debug/Release 的抛出条件相同。
- [ ] 每个 `noexcept` 函数的函数体不调用 `at()` 或其他会抛的接口。
- [ ] 项目若保留 `Check` / `DebugCheck`：`Check` 两模式都生效，`DebugCheck` 只在 Debug 生效；没有让 Debug 抛、Release 返回 false。
