<!-- 读取时机：查语言细节时；读完能回答：类、结构体与特殊成员；预算：一次只开这一份（15 行），不自动串联。 -->
# 类、结构体与特殊成员

- `struct` 用于公开数据的聚合；`class` 用于维护不变量、隐藏表示。两者只差默认访问权限，按语义选。
- 数据成员默认私有；需要暴露只读视图时提供 `const` 成员函数，不返回可变内部引用。
- 单参数构造函数用 `explicit`；构造函数失败时抛异常，不留下半初始化对象。
- 特殊成员（构造、析构、拷贝、移动）在头文件声明，在 `.cpp` 定义；只有默认实现足够时才写 `= default`，默认构造要无参数，拷贝/移动构造按各自的签名。
- 定义了析构函数、拷贝构造或拷贝赋值之一时，认真考虑其余特殊成员；用 `= delete` 明确禁止不需要的操作。
- 多态基类析构函数必须是 `virtual` 或 `protected`；否则通过基类指针删除派生对象是未定义行为。
- 不在构造函数里调用虚函数；此时派生部分还没构造完。

## 依据

- [ISO C++ `[class]`](https://eel.is/c++draft/class)：类成员、访问控制与特殊成员的声明规则。
- [cppreference: Classes](https://en.cppreference.com/w/cpp/language/classes)：构造/析构、拷贝/移动与 `= default`/`= delete`。
- [Google C++ Style Guide: Classes](https://google.github.io/styleguide/cppguide.html#Classes)：struct 与 class 的分工、显式构造函数与虚析构。
