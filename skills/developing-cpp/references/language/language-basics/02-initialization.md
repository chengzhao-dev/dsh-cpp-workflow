<!-- 读取时机：查语言细节时；读完能回答：初始化与列表初始化；预算：一次只开这一份（26 行），不自动串联。 -->
# 初始化与列表初始化

默认用花括号初始化，只在需要拷贝初始化或 `auto` 推导时用 `=`；`name = {{` 只用于多行聚合常量表：

```cpp
int count{};                       // 值初始化，0
std::vector<int> values{1, 2, 3};  // 列表初始化
std::string name = "demo";         // 拷贝初始化，类型明确
auto total = 0.0;                  // 本工作流统一用 = 推导
```

- `kLines` 这类多行聚合常量表写 `name = {{`；单个对象和空初始化仍写 `count{}`，不写 `=`；不把其他花括号初始化改成 `=`。
- `T value{}` 做值初始化：内置类型得 0，类类型调用默认构造函数。
- `auto x{1}` 的推导类型在 C++17 前后不同：C++17 起是 `int`，之前是 `std::initializer_list<int>`；`{}` 与 `initializer_list` 的重载也容易误读，本工作流统一写 `auto x = 1`。
- 花括号禁止窄化转换：`int x{3.5}` 编译失败，`int x = 3.5` 静默截断。需要截断时显式 `static_cast<int>(3.5)`。
- `std::vector<int> values(3)` 是三个 0；`values{3}` 是一个元素 3。两种括号语义不同，不要凭习惯混用。
- 类成员在声明处写默认成员初始化（NSDMI），一律用花括号：标量 `count_{0}`，数组 `items_{}`，容器与类类型成员写空 `{}`（如 `std::vector<int> values_{};`、`Board board_{};`）。
- `=` 只用于花括号不可用或会改变含义的例外：引用成员不写 NSDMI，在构造函数初始化列表绑定；容器需要 `std::vector<int>(n)` 的容量构造时写 `= std::vector<int>(n)`，或在构造函数初始化列表写 `v_(n)`；`std::initializer_list` 成员避免使用，确实需要时写 `= {..}` 并保证底层数组的生命周期长于对象；花括号无法构造的类型才回退到 `= value` 或构造函数初始化列表。`=` 仍然是初始化，不是赋值。
- `static` 与 `static constexpr` 数据成员不是对象成员，继续写 `= 3`；`auto` 不能做非静态数据成员。
- 构造函数初始化列表按成员声明顺序执行，不按书写顺序；初始化列表顺序与声明顺序保持一致，避免依赖未初始化成员。

## 依据

- [ISO C++ `[dcl.init]`](https://eel.is/c++draft/dcl.init)：值初始化、列表初始化、拷贝初始化与窄化转换。
- [cppreference: Initialization](https://en.cppreference.com/w/cpp/language/initialization)：各种初始化语法与重载选择。
- [C++ Core Guidelines: ES.23](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#res-list)：优先 `{}` 初始化；本工作流按此执行，并只为拷贝/`auto` 保留 `=`。
