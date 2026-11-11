<!-- 读取时机：查语言细节时；读完能回答：初始化与列表初始化；预算：一次只开这一份（33 行），不自动串联。 -->
# 初始化与列表初始化

默认用花括号初始化普通对象：多参数写 `T obj{a, b}`，单参数写 `T obj{a}`，空初始化写 `T obj{}`。具体写法与例外如下。

```cpp
int count{};                       // 值初始化，0
std::vector<int> values{1, 2, 3};  // 列表初始化
std::string name = "demo";         // 拷贝初始化，类型明确
auto total = 0.0;                  // 本工作流统一用 = 推导
```

- 拷贝初始化用 `=`：`std::string name = "demo";`、`auto total = 0.0;`。`auto` 统一用 `=`，不写 `auto x{1}`。
- `kLines` 这类多行聚合常量表写 `name = {{`；单个对象和空初始化仍写 `count{}`，不写 `=`；不把其他花括号初始化改成 `=`。
- 需要调用 `std::initializer_list` 之外的重载时用 `()`：`std::vector<int> values(3)` 是三个 0，`values{3}` 是一个元素 3。这是 `()` 唯一的常规用途，不要用它初始化其他普通对象。
- `T obj();` 是函数声明，不是对象；要值初始化写 `T obj{};`。
- `T value{}` 做值初始化：内置类型得 0，类类型调用默认构造函数。
- 花括号禁止窄化转换：`int x{3.5}` 编译失败，`int x = 3.5` 静默截断。需要截断时显式 `static_cast<int>(3.5)`。
- 类成员在声明处写默认成员初始化（NSDMI），默认用花括号：标量 `count_{0}`，数组 `items_{}`，容器与类类型成员写空 `{}`（如 `std::vector<int> values_{};`、`Board board_{};`）。
- 构造函数初始化列表也默认用花括号：`input_{input}`、`count_{0}`。引用成员不写 NSDMI，在构造函数初始化列表绑定；容器需要容量构造时写 `values_(n)`，或在声明处写 `= std::vector<int>(n)`。这两处的 `()` 用来选容量构造，不属于普通对象的默认写法。
- `std::initializer_list` 成员避免使用，确实需要时写 `= {..}` 并保证底层数组的生命周期不短于对象；花括号无法构造的类型才回退到 `= value` 或构造函数初始化列表。`=` 仍然是初始化，不是赋值。
- `static` 与 `static constexpr` 数据成员不是对象成员，继续写 `= 3`；`auto` 不能做非静态数据成员。
- 构造函数初始化列表按成员声明顺序执行，不按书写顺序；初始化列表顺序与声明顺序保持一致，避免依赖未初始化成员。

## 依据

- [Stack Overflow: 构造与统一初始化](https://stackoverflow.com/questions/24953658/what-are-the-differences-between-c-like-constructor-and-uniform-initialization)：`vector<int> v(100)` 与 `v{100}` 的元素数不同；花括号优先匹配 `initializer_list`。
- [Stack Overflow: `Object obj()`](https://stackoverflow.com/questions/34403515/whats-difference-between-object-obj-object-and-object-obj)：`Object obj();` 声明函数，`Object obj{};` 才是对象。
- [Google C++ Style Guide: Variable initialization](https://google.github.io/styleguide/cppguide.html#Variable_Initialization)：`=`、`()`、`{}` 都能完成初始化；本工作流为普通对象选花括号。
- [ISO C++ `[dcl.init]`](https://eel.is/c++draft/dcl.init)：值初始化、列表初始化与拷贝初始化。
- [ISO C++ `[dcl.init.list]`](https://eel.is/c++draft/dcl.init.list)：列表初始化细节与窄化转换。
- [ISO C++ `[over.match.list]`](https://eel.is/c++draft/over.match.list)：花括号优先匹配 `initializer_list` 构造。
- [cppreference: Initialization](https://en.cppreference.com/w/cpp/language/initialization)：各种初始化语法与重载选择。
- [C++ Core Guidelines: ES.23](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#res-list)：优先 `{}` 初始化；本条只解释花括号偏好，不是本工作流的第一依据。
