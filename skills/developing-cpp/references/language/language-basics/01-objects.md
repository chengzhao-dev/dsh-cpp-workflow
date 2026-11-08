# 值与对象

这里只写“换一台机器、换一个编译器仍然成立”的 C++11–C++23 语言规则；示例默认 C++23，C++11/14/17/20 项目按声明降级。项目专属类型、协议字段和构建目录不在本组条文。

- 类型决定允许的操作和表示；对象是某类型的一块存储；值是可以复制、比较、传递的内容。
- 变量有名字、类型、存储期和作用域。局部变量在离开作用域时销毁；`static` 局部变量在首次执行到声明时初始化，程序结束时销毁。
- 声明让名字可见，定义分配存储或给出函数体。非 `inline` 的变量与函数一个程序只能定义一次；`inline` 函数/变量与模板可以出现在多个翻译单元，但定义必须一致。头文件只放声明，定义放 `.cpp`，例外是 `inline` 与模板。
- 引用是已有对象的别名，必须初始化，不能重新绑定；指针可以为空，也可以改指向。接口优先用引用表达“必须存在”，用指针表达“可以不存在”。
- `*this` 不用于复制当前对象：要一份副本就直说语义（如“推演落子”只读原数据，或显式写一个复制函数）。`return *this` 仍只属于赋值运算符，值类型没有这种运算符。

## 依据

- [ISO C++ `[basic.def.odr]`](https://eel.is/c++draft/basic.def.odr)：一个实体允许的声明与定义次数，以及 ODR 的一致要求。
- [cppreference: Definitions and ODR](https://en.cppreference.com/w/cpp/language/definition)：声明、定义、`inline` 与模板的多翻译单元规则。
- [C++ Core Guidelines: P.1](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-philosophy)：用类型与对象表达意图，不靠注释补语义。
