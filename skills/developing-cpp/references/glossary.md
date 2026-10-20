# 术语

代码标识符用英文；注释和说明用中文时，同一个概念只用一种译法。下表是本项目的默认译法，项目技能可以增补，但不要改已有词的含义。

| 英文 | 中文 | 说明 |
| --- | --- | --- |
| declaration | 声明 | 告诉编译器名字和类型，不分配存储 |
| definition | 定义 | 分配存储或给出函数体 |
| translation unit | 翻译单元 | 一个 `.cpp` 加上它包含的头，预处理后的整体 |
| header | 头文件 | `.h` / `.hpp`，放声明和可内联实现 |
| source file | 源文件 | `.cpp`，放普通函数体 |
| target | 目标 | CMake 的构建单元，如 `app`、`greeting` |
| observable behavior | 可观察行为 | 用户或测试能看到的输出、返回值、退出码、文件内容 |
| boundary | 边界 | 库与程序、模块与模块之间的职责分界 |
| invariant | 不变量 | 对象在任何公共操作后都必须成立的条件 |
| contract | 契约 | 调用方必须满足的前置条件，以及被调用方承诺的结果 |
| precondition | 前置条件 | 调用前必须为真；违反通常抛合同异常 |
| postcondition | 后置条件 | 调用成功后保证为真 |
| exception safety | 异常安全 | 抛出后对象仍有效、资源不泄漏的保证 |
| ownership | 所有权 | 谁负责释放资源；`unique_ptr` 表达独占 |
| value semantics | 值语义 | 拷贝后互不影响 |
| reference semantics | 引用语义 | 多个名字共享同一对象 |
| aggregate | 聚合 | 无用户构造函数、无私有成员，可直接列表初始化 |
| RAII | 资源获取即初始化 | 构造函数获取资源，析构函数释放 |
| compile database | 编译数据库 | `compile_commands.json`，clangd/clang-tidy 用它还原编译命令 |
| static analysis | 静态分析 | 不运行程序就检查代码，如 clang-tidy |
| formatting | 格式化 | 按固定规则排版，如 clang-format；也指 `std::format` 的消息组合 |
| diagnostic | 诊断 | 编译器或工具给出的一条问题报告 |
| warning-as-error | 警告即错误 | 把警告当失败处理，避免积累 |
| undefined behavior | 未定义行为 | 标准不规定结果，必须避免 |
| half-open range | 半开区间 | `[begin, end)`，包含 begin 不包含 end |
| Yoda condition | 尤达条件 | 常量写在左侧的比较，如 `0 == x`，本项目禁止 |
| out-parameter | 输出参数 | 通过引用/指针返回结果；优先用返回值替代 |
| access control | 访问控制 | `public` / `protected` / `private` 决定谁能使用成员 |
| data member | 数据成员 | 属于对象的数据；不要叫「成员变量」 |
| member function | 成员函数 | 声明在类内、可访问对象的函数 |
| object | 对象 | 一块具有类型和生命周期的存储 |
| lifetime | 生命周期 | 对象从构造完成到析构开始之间 |
| value category | 值类别 | 左值、右值等表达式分类，决定能否绑定引用和移动 |
| dangling reference | 悬垂引用 | 引用的对象已经销毁 |
| use-after-free | 释放后使用 | 释放后仍访问对象，未定义行为 |
| memory leak | 内存泄漏 | 失去所有权但未释放的资源 |
| double free | 重复释放 | 同一资源释放两次，未定义行为 |
| storage duration | 存储期 | 自动、静态、线程、动态四种生存范围 |
| scope | 作用域 | 名字可见的代码区域 |
| qualified name | 限定名 | 带命名空间或类前缀的名字，如 `inventory::Item` |
| namespace | 命名空间 | 给名字分组、避免冲突的作用域 |
| forward declaration | 前向声明 | 只声明名字不给出定义，减少头文件依赖 |
| include guard | 包含守卫 | 防止头文件重复展开；本项目用 `#pragma once` |
| ODR | 单一定义规则 | 一个实体在整个程序中至多一个定义，内联实体例外 |
| overload | 重载 | 同名但参数不同的函数 |
| template | 模板 | 按类型或值参数生成代码的机制 |
| instantiation | 实例化 | 用具体参数生成模板实体 |
| concept | 概念 | C++20 对模板参数的命名约束 |
| type deduction | 类型推导 | 由初始化器或实参推断类型，如 `auto` |
| narrowing | 窄化转换 | 可能丢信息的隐式转换，列表初始化禁止 |
| value initialization | 值初始化 | `T{}` 产生零值或默认构造的对象 |
| zero initialization | 零初始化 | 静态存储对象先置零 |
| default member initializer | 默认成员初始化器 | 类内 `member_{}` 或 `= value` |
| copy elision | 拷贝消除 | 编译器直接构造目标对象，省略拷贝/移动 |
| RVO | 返回值优化 | 拷贝消除的一种，返回局部对象时直接构造 |
| move semantics | 移动语义 | 把资源所有权从源对象转出 |
| moved-from state | 移后状态 | 对象仍有效但值未指定，只能析构或重置 |
| `noexcept` | 不抛异常保证 | 函数承诺不向外抛异常 |
| iterator | 迭代器 | 指向容器元素的泛化指针 |
| invalidation | 失效 | 容器修改后旧迭代器/引用不可再用 |
| allocator | 分配器 | 容器用来申请释放内存的策略对象 |
| `std::string_view` | 字符串视图 | 不拥有字符的只读视图，生命周期由调用方保证 |
| `std::span` | 连续序列视图 | C++20 不拥有元素的连续区间视图 |
| executable | 可执行文件 | 带入口、可被操作系统加载运行的文件 |
| static library | 静态库 | `.a` / `.lib`，链接时复制所需目标文件 |
| shared library | 共享库 | `.so` / `.dylib` / `.dll`，运行时加载 |
| link | 链接 | 把目标文件和库合成可执行文件或共享库 |
| load | 加载 | 运行时把可执行文件和依赖库映射进进程 |
| RPATH | 运行时库搜索路径 | 可执行文件内记录的共享库查找目录 |
| undefined reference | 未定义引用 | 链接器找不到某个符号的定义 |
| compile command | 编译命令 | 单个翻译单元的完整命令行 |
| build directory | 构建目录 | 存放生成物和缓存的目录，不进版本库 |
| build tree | 构建树 | 一次配置产生的完整目录结构 |
| reproducible build | 可复现构建 | 相同输入产生相同产物 |

## 容易混的词

- **声明 vs 定义**：头文件里多是声明；函数体、全局变量初始化是定义。
- **参数 vs 实参**：声明里叫参数（parameter），调用点叫实参（argument）；中文口语都叫参数时，写文档要区分。
- **接口 vs 实现**：公共头是接口，`.cpp` 是实现；不要用「接口」指整个类。
- **异常 vs 错误**：异常是语言机制；错误是结果。可预期错误用返回值，不叫「异常」。
- **格式化 vs 排版**：`std::format` 组合消息；clang-format 排版源码。不要混用「格式化」指代两者。
