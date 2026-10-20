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

## 容易混的词

- **声明 vs 定义**：头文件里多是声明；函数体、全局变量初始化是定义。
- **参数 vs 实参**：声明里叫参数（parameter），调用点叫实参（argument）；中文口语都叫参数时，写文档要区分。
- **接口 vs 实现**：公共头是接口，`.cpp` 是实现；不要用「接口」指整个类。
- **异常 vs 错误**：异常是语言机制；错误是结果。可预期错误用返回值，不叫「异常」。
- **格式化 vs 排版**：`std::format` 组合消息；clang-format 排版源码。不要混用「格式化」指代两者。
