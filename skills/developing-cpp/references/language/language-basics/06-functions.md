<!-- 读取时机：查语言细节时；读完能回答：函数、参数与返回值；预算：一次只开这一份（17 行），不自动串联。 -->
# 函数、参数与返回值

- 命名规则以 `references/naming/01-identifier-names.md` 为准：函数 PascalCase、查询 `Is` / `Has` / `Can` / `Get` / `Find`、转换 `SourceToTarget`。
- 输入参数默认按值传小对象、按 `const&` 传大对象；需要修改调用方对象时用引用参数，并在名字或注释里标 `[out]`。
- 优先返回值而不是输出参数；需要返回多个值时用 `struct` 聚合，不用多个 `bool` 输出参数。
- 返回容器或大对象时按值返回，依赖 RVO / 移动；不要返回局部对象的引用或指针。
- 单参数构造函数加 `explicit`，除非确实需要隐式转换；转换运算符也加 `explicit`。
- 不在虚函数上写默认参数；默认参数在静态类型处绑定，派生类改默认值会造成意外。
- 函数只做一件事；超过一屏时先找可命名的子步骤，分阶段与注释写法见 `steps/04-implementation.md`。
- lambda 捕获按需列名，不默认写 `[this]`：只在确实要读写成员时才捕获 `this`，只读个别值时按名捕获，纯计算写 `[]`。需要成员访问时优先把要用的值取到局部变量再捕获；捕获 `this` 的 lambda 不得比对象活得更久，异步或存储回调前先复制需要的值。

## 依据

- [ISO C++ `[dcl.fct]`](https://eel.is/c++draft/dcl.fct)：函数声明、参数与返回类型。
- [cppreference: Functions](https://en.cppreference.com/w/cpp/language/functions)：重载、默认参数与返回类型推导。
- [Google C++ Style Guide: Functions](https://google.github.io/styleguide/cppguide.html#Functions)：短小、单一职责，参数与返回值写清契约。
- [Google C++ Style Guide: Lambda expressions](https://google.github.io/styleguide/cppguide.html#Lambda_expressions)：优先显式捕获、按值捕获要用的对象；捕获 `this` 的 lambda 不能比对象活得更久。
